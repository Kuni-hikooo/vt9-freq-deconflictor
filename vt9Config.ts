// ============================================================
// VT-9 DECONFLICTION CONFIG
// All squadron-specific rules live here. Editable in-app.
// ============================================================

export interface EventTypeConfig {
  name: string;
  blockUnits: number;
  blockUnitsMin?: number; // for flexible types like TAC
  preferredAirspace: ("area4" | "moa2")[];
  needsTacan: boolean;
  needsCm: number; // 0, 1, or 2
  tacanPairs: number; // how many TACAN pairs this event needs
  tacanSequential?: boolean; // DTF: pairs must be sequential
}

export interface TacanPair {
  base: number;
  paired: number;
  presetName?: string;
  presetFreq?: number;
}

export const AIRSPACE_CONFIG = {
  totalBlockUnits: 8,
  area4: {
    label: "Area 4",
    blockUnits: 4,
    physicalBlocks: ["A4-1", "A4-2", "A4-3", "A4-4"],
  },
  moa2: {
    label: "MOA 2",
    blockUnits: 4, // math units
    physicalBlocks: ["MOA2-A", "MOA2-B"], // real display blocks (each = 2 units)
    physicalBlocksExtreme: ["MOA2-A", "MOA2-B", "MOA2-C"], // 3-way split extreme case
  },
};

export const EVENT_TYPES: Record<string, EventTypeConfig> = {
  TR: {
    name: "TR",
    blockUnits: 1,
    preferredAirspace: ["area4"],
    needsTacan: false,
    needsCm: 0,
    tacanPairs: 0,
  },
  IR: {
    name: "IR",
    blockUnits: 0,
    preferredAirspace: [],
    needsTacan: false,
    needsCm: 0,
    tacanPairs: 0,
  },
  AN: {
    name: "AN",
    blockUnits: 0,
    preferredAirspace: [],
    needsTacan: false,
    needsCm: 0,
    tacanPairs: 0,
  },
  FRM: {
    name: "FRM",
    blockUnits: 1,
    preferredAirspace: ["area4"],
    needsTacan: true,
    needsCm: 1,
    tacanPairs: 1,
  },
  DIV: {
    name: "DIV",
    blockUnits: 2,
    preferredAirspace: ["area4"],
    needsTacan: true,
    needsCm: 1,
    tacanPairs: 1,
  },
  DTF: {
    name: "DTF",
    blockUnits: 2,
    preferredAirspace: ["moa2"],
    needsTacan: true,
    needsCm: 2,
    tacanPairs: 2,
    tacanSequential: true,
  },
  TAC: {
    name: "TAC",
    blockUnits: 2,
    blockUnitsMin: 1,
    preferredAirspace: ["area4", "moa2"],
    needsTacan: true,
    needsCm: 1,
    tacanPairs: 1,
  },
  BFM: {
    name: "BFM",
    blockUnits: 2,
    preferredAirspace: ["moa2"],
    needsTacan: true,
    needsCm: 1,
    tacanPairs: 1,
  },
  FTX: {
    name: "FTX",
    blockUnits: 2,
    preferredAirspace: ["moa2"],
    needsTacan: true,
    needsCm: 1,
    tacanPairs: 1,
  },
  SEM: {
    name: "SEM",
    blockUnits: 2,
    preferredAirspace: ["moa2"],
    needsTacan: true,
    needsCm: 1,
    tacanPairs: 1,
  },
  SLL: {
    name: "SLL",
    blockUnits: 0,
    preferredAirspace: [],
    needsTacan: false,
    needsCm: 0,
    tacanPairs: 0,
  },
  ON: {
    name: "ON",
    blockUnits: 0,
    preferredAirspace: [],
    needsTacan: false,
    needsCm: 0,
    tacanPairs: 0,
  },
  OCF: {
    name: "OCF",
    blockUnits: 1,
    preferredAirspace: ["area4"],
    needsTacan: true,
    needsCm: 1,
    tacanPairs: 1,
  },
  BITS: {
    name: "BITS",
    blockUnits: 1,
    preferredAirspace: ["area4"],
    needsTacan: true,
    needsCm: 1,
    tacanPairs: 1,
  },
  IPROF: {
    name: "IPROF",
    blockUnits: 0,
    preferredAirspace: [],
    needsTacan: false,
    needsCm: 0,
    tacanPairs: 0,
  },
};

// Dedicated TACAN pairs — use these first
export const DEDICATED_TACAN_PAIRS: TacanPair[] = [
  { base: 17, paired: 80, presetName: "TAC17", presetFreq: 265.9 },
  { base: 18, paired: 81, presetName: "TAC18", presetFreq: 261.35 },
  { base: 19, paired: 82, presetName: "TAC19", presetFreq: 264.35 },
  { base: 20, paired: 83, presetName: "TAC20", presetFreq: 271.7 },
  { base: 21, paired: 84, presetName: "TAC21", presetFreq: 225.8 },
];

// Channels reserved for VT-7 — never use as overflow base
export const RESERVED_CHANNELS = [22, 23, 24, 25, 26];

// Max TACAN channel value
export const TACAN_MAX = 126;

// ChatterMark frequency pool
export const CM_POOL: number[] = [
  234.5, 246.7, 246.8, 246.9, 299.5, 300.6, 303.0, 333.3, 333.55, 357.0,
];

// CNATRA URL pattern
export function buildCnataraUrl(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `https://www.cnatra.navy.mil/scheds/TW1/SQ-VT-9/!${y}-${m}-${d}!VT-9!Frontpage.pdf`;
}
