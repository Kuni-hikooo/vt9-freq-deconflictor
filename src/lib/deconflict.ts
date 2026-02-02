"use client";

import {
  Flight,
  DeconflictResult,
  AirspaceAssignment,
  TacanAssignment,
  FrequencyAssignment,
  Conflict,
} from "@/lib/types";
import {
  EVENT_TYPES,
  AIRSPACE_CONFIG,
  DEDICATED_TACAN_PAIRS,
  RESERVED_CHANNELS,
  TACAN_MAX,
  CM_POOL,
} from "@/config/vt9Config";

// ============================================================
// HELPERS
// ============================================================

/** Convert HHMM integer to minutes since midnight for math */
function toMinutes(hhmm: number): number {
  return Math.floor(hhmm / 100) * 60 + (hhmm % 100);
}

/** Do two flights' active windows overlap? (T/O through Land) */
function overlaps(a: Flight, b: Flight): boolean {
  const aStart = toMinutes(a.scheduledTO);
  const aEnd = toMinutes(a.scheduledLand);
  const bStart = toMinutes(b.scheduledTO);
  const bEnd = toMinutes(b.scheduledLand);
  return aStart < bEnd && bStart < aEnd;
}

/** Get all flights that overlap with a given flight */
function getOverlapping(flight: Flight, allFlights: Flight[]): Flight[] {
  return allFlights.filter((f) => f.id !== flight.id && overlaps(flight, f));
}

// ============================================================
// AIRSPACE ALLOCATION
// ============================================================

function allocateAirspace(
  flight: Flight,
  allResults: DeconflictResult[],
  allFlights: Flight[]
): { assignment: AirspaceAssignment | null; conflicts: Conflict[] } {
  const config = EVENT_TYPES[flight.eventType];
  if (!config || config.blockUnits === 0) {
    return { assignment: null, conflicts: [] };
  }

  const overlapping = getOverlapping(flight, allFlights);

  // Calculate current usage by airspace at this flight's time window
  let area4Used = 0;
  let moa2Used = 0;

  for (const res of allResults) {
    if (!res.airspace) continue;
    // Check if this result's flight overlaps with our flight
    const resFlightOverlaps = overlapping.some((f) => f.id === res.flight.id);
    if (!resFlightOverlaps) continue;

    if (res.airspace.airspace === "area4") area4Used += res.airspace.blockUnits;
    if (res.airspace.airspace === "moa2") moa2Used += res.airspace.blockUnits;
  }

  const area4Available = AIRSPACE_CONFIG.area4.blockUnits - area4Used;
  const moa2Available = AIRSPACE_CONFIG.moa2.blockUnits - moa2Used;
  const totalAvailable = area4Available + moa2Available;
  let needed = config.blockUnits;
  let flexedDown = false;

  // For flex-capable events (TAC), only flex down if NO single airspace can fit full requirement
  if (config.blockUnitsMin && config.blockUnitsMin < config.blockUnits) {
    const canAnyFitFull = Math.max(area4Available, moa2Available) >= config.blockUnits;

    if (!canAnyFitFull && config.blockUnitsMin <= Math.max(area4Available, moa2Available)) {
      needed = config.blockUnitsMin;
      flexedDown = true;
    }
  }

  if (needed > totalAvailable) {
    return {
      assignment: null,
      conflicts: [
        {
          type: "airspace_full",
          message: `Airspace full for ${flight.id} (${flight.eventType}): needs ${config.blockUnits} block units, only ${totalAvailable} available. Area 4: ${area4Used}/4 used, MOA 2: ${moa2Used}/4 used.`,
          involvedFlightIds: [flight.id, ...overlapping.map((f) => f.id)],
        },
      ],
    };
  }

  // Assign to preferred airspace if available, otherwise alternate
  const preferred = config.preferredAirspace;
  let assigned: "area4" | "moa2" | null = null;

  for (const pref of preferred) {
    const used = pref === "area4" ? area4Used : moa2Used;
    const max = pref === "area4" ? AIRSPACE_CONFIG.area4.blockUnits : AIRSPACE_CONFIG.moa2.blockUnits;
    if (used + needed <= max) {
      assigned = pref;
      break;
    }
  }

  // If preferred is full, try the other one
  if (!assigned) {
    const alt = preferred[0] === "area4" ? "moa2" : "area4";
    const altUsed = alt === "area4" ? area4Used : moa2Used;
    const altMax = alt === "area4" ? AIRSPACE_CONFIG.area4.blockUnits : AIRSPACE_CONFIG.moa2.blockUnits;
    if (altUsed + needed <= altMax) {
      assigned = alt;
    }
  }

  if (!assigned) {
    return {
      assignment: null,
      conflicts: [
        {
          type: "airspace_full",
          message: `No suitable airspace block for ${flight.id} (${flight.eventType}): preferred airspace full and alternate also full.`,
          involvedFlightIds: [flight.id],
        },
      ],
    };
  }

  // Pick a physical block label for display
  const physicalBlock = pickPhysicalBlock(assigned, needed, allResults, overlapping);

  return {
    assignment: {
      airspace: assigned,
      blockUnits: needed,
      physicalBlock,
      flexedDown,
    },
    conflicts: [],
  };
}

/** Pick a physical block label based on what's available */
function pickPhysicalBlock(
  airspace: "area4" | "moa2",
  blockUnits: number,
  allResults: DeconflictResult[],
  overlapping: Flight[]
): string {
  if (airspace === "area4") {
    // Find an unused Area 4 block
    const usedBlocks = new Set<string>();
    for (const res of allResults) {
      if (res.airspace?.airspace === "area4" && overlapping.some((f) => f.id === res.flight.id)) {
        usedBlocks.add(res.airspace.physicalBlock);
      }
    }
    for (const block of AIRSPACE_CONFIG.area4.physicalBlocks) {
      if (!usedBlocks.has(block)) return block;
    }
    return AIRSPACE_CONFIG.area4.physicalBlocks[0]; // fallback
  } else {
    // MOA 2: each physical block = 2 units
    const usedBlocks = new Set<string>();
    for (const res of allResults) {
      if (res.airspace?.airspace === "moa2" && overlapping.some((f) => f.id === res.flight.id)) {
        usedBlocks.add(res.airspace.physicalBlock);
      }
    }
    // If we need 2 block units (1 physical block), pick an open one
    for (const block of AIRSPACE_CONFIG.moa2.physicalBlocks) {
      if (!usedBlocks.has(block)) return block;
    }
    // Extreme case: split into 3
    return "MOA2-C";
  }
}

// ============================================================
// TACAN ALLOCATION
// ============================================================

function allocateTacan(
  flight: Flight,
  allResults: DeconflictResult[],
  allFlights: Flight[]
): { assignments: TacanAssignment[]; conflicts: Conflict[] } {
  const config = EVENT_TYPES[flight.eventType];
  if (!config || !config.needsTacan) {
    return { assignments: [], conflicts: [] };
  }

  // Singles don't need TACAN
  if (flight.flightType === "single") {
    return { assignments: [], conflicts: [] };
  }

  const overlapping = getOverlapping(flight, allFlights);

  // Gather all TACAN base channels currently in use by overlapping flights
  const usedBases = new Set<number>();
  for (const res of allResults) {
    if (!overlapping.some((f) => f.id === res.flight.id)) continue;
    for (const t of res.tacan) {
      usedBases.add(t.base);
    }
  }

  const pairsNeeded = config.tacanPairs;
  const assignments: TacanAssignment[] = [];

  if (config.tacanSequential && pairsNeeded === 2) {
    // DTF: need 2 sequential pairs
    const seq = findSequentialPairs(usedBases);
    if (!seq) {
      return {
        assignments: [],
        conflicts: [
          {
            type: "dtf_sequential_unavailable",
            message: `No sequential TACAN pair available for ${flight.id} (DTF). All sequential pairs are in use.`,
            involvedFlightIds: [flight.id, ...overlapping.map((f) => f.id)],
          },
        ],
      };
    }
    assignments.push(...seq);
  } else {
    // Standard: need 1 pair
    const pair = findAvailablePair(usedBases);
    if (!pair) {
      return {
        assignments: [],
        conflicts: [
          {
            type: "tacan_exhausted",
            message: `No TACAN pair available for ${flight.id} (${flight.eventType}). All pairs in use.`,
            involvedFlightIds: [flight.id, ...overlapping.map((f) => f.id)],
          },
        ],
      };
    }
    assignments.push(pair);
  }

  return { assignments, conflicts: [] };
}

/** Find a single available TACAN pair (dedicated first, then overflow) */
function findAvailablePair(usedBases: Set<number>): TacanAssignment | null {
  // Try dedicated pool first
  for (const pair of DEDICATED_TACAN_PAIRS) {
    if (!usedBases.has(pair.base)) {
      return {
        base: pair.base,
        paired: pair.paired,
        presetName: pair.presetName,
        presetFreq: pair.presetFreq,
        isOverflow: false,
      };
    }
  }

  // Overflow: find first valid base channel
  for (let base = 1; base <= 63; base++) {
    if (RESERVED_CHANNELS.includes(base)) continue;
    if (usedBases.has(base)) continue;
    const paired = base + 63;
    if (paired > TACAN_MAX) continue;
    return { base, paired, isOverflow: true };
  }

  return null; // truly exhausted (shouldn't happen in practice)
}

/** Find two sequential pairs for DTF */
function findSequentialPairs(usedBases: Set<number>): TacanAssignment[] | null {
  // Try dedicated pool first — look for two sequential dedicated pairs
  for (let i = 0; i < DEDICATED_TACAN_PAIRS.length - 1; i++) {
    const a = DEDICATED_TACAN_PAIRS[i];
    const b = DEDICATED_TACAN_PAIRS[i + 1];
    if (b.base - a.base === 1 && !usedBases.has(a.base) && !usedBases.has(b.base)) {
      return [
        { base: a.base, paired: a.paired, presetName: a.presetName, presetFreq: a.presetFreq, isOverflow: false },
        { base: b.base, paired: b.paired, presetName: b.presetName, presetFreq: b.presetFreq, isOverflow: false },
      ];
    }
  }

  // Overflow: find two sequential overflow bases
  for (let base = 1; base < 63; base++) {
    if (RESERVED_CHANNELS.includes(base) || RESERVED_CHANNELS.includes(base + 1)) continue;
    if (usedBases.has(base) || usedBases.has(base + 1)) continue;
    const pairedA = base + 63;
    const pairedB = base + 1 + 63;
    if (pairedB > TACAN_MAX) continue;
    return [
      { base, paired: pairedA, isOverflow: true },
      { base: base + 1, paired: pairedB, isOverflow: true },
    ];
  }

  return null;
}

// ============================================================
// FREQUENCY ALLOCATION
// ============================================================

function allocateFrequencies(
  flight: Flight,
  tacanAssignment: TacanAssignment[],
  allResults: DeconflictResult[],
  allFlights: Flight[]
): { assignment: FrequencyAssignment; conflicts: Conflict[] } {
  const config = EVENT_TYPES[flight.eventType];

  // Singles and zero-airspace events don't need comms
  if (!config || !config.needsTacan || flight.flightType === "single") {
    return {
      assignment: { preset: null, presetName: null, cms: [] },
      conflicts: [],
    };
  }

  const overlapping = getOverlapping(flight, allFlights);

  // Gather CMs currently in use by overlapping flights
  const usedCms = new Set<number>();
  for (const res of allResults) {
    if (!overlapping.some((f) => f.id === res.flight.id)) continue;
    for (const cm of res.frequencies.cms) {
      usedCms.add(cm);
    }
  }

  // Determine preset(s) from TACAN assignment
  let preset: number | null = null;
  let presetName: string | null = null;
  if (tacanAssignment.length > 0 && tacanAssignment[0].presetFreq) {
    preset = tacanAssignment[0].presetFreq;
    presetName = tacanAssignment[0].presetName ?? null;
  }

  // Determine how many CMs we need
  let cmsNeeded = config.needsCm; // base requirement (1 or 2)

  // Overflow rules: if no preset available, add 1 CM per missing preset
  const overflowPairs = tacanAssignment.filter((t) => t.isOverflow);
  if (overflowPairs.length > 0) {
    // Each overflow pair that has no preset needs an extra CM
    cmsNeeded += overflowPairs.length;
    // If ALL pairs are overflow, preset is null
    if (tacanAssignment.every((t) => t.isOverflow)) {
      preset = null;
      presetName = null;
    }
  }

  // Assign CMs from pool
  const cms: number[] = [];
  for (const freq of CM_POOL) {
    if (cms.length >= cmsNeeded) break;
    if (!usedCms.has(freq)) {
      cms.push(freq);
    }
  }

  if (cms.length < cmsNeeded) {
    return {
      assignment: { preset, presetName, cms },
      conflicts: [
        {
          type: "cm_exhausted",
          message: `ChatterMark pool exhausted for ${flight.id} (${flight.eventType}). Needed ${cmsNeeded} CM(s), only ${cms.length} available.`,
          involvedFlightIds: [flight.id, ...overlapping.map((f) => f.id)],
        },
      ],
    };
  }

  return {
    assignment: { preset, presetName, cms },
    conflicts: [],
  };
}

// ============================================================
// MAIN ENGINE
// ============================================================

/**
 * Runs the full deconfliction algorithm on a set of grouped flights.
 * Returns one DeconflictResult per flight, plus a consolidated conflict list.
 */
export function runDeconfliction(flights: Flight[]): {
  results: DeconflictResult[];
  conflicts: Conflict[];
} {
  // Sort by T/O time (greedy chronological allocation)
  const sorted = [...flights].sort((a, b) => a.scheduledTO - b.scheduledTO);

  const results: DeconflictResult[] = [];
  const allConflicts: Conflict[] = [];

  for (const flight of sorted) {
    const flightConflicts: Conflict[] = [];

    // 1. Allocate airspace
    const { assignment: airspace, conflicts: airConflicts } = allocateAirspace(
      flight,
      results,
      sorted
    );
    flightConflicts.push(...airConflicts);

    // 2. Allocate TACAN
    const { assignments: tacan, conflicts: tacanConflicts } = allocateTacan(
      flight,
      results,
      sorted
    );
    flightConflicts.push(...tacanConflicts);

    // 3. Allocate frequencies
    const { assignment: frequencies, conflicts: freqConflicts } = allocateFrequencies(
      flight,
      tacan,
      results,
      sorted
    );
    flightConflicts.push(...freqConflicts);

    results.push({
      flight,
      airspace,
      tacan,
      frequencies,
      conflicts: flightConflicts,
    });

    allConflicts.push(...flightConflicts);
  }

  return { results, conflicts: allConflicts };
}
