"use client";

import { ScheduleLine, Flight } from "@/lib/types";
import { EVENT_TYPES } from "@/config/vt9Config";

// ============================================================
// STEP 1: Extract raw schedule lines from PDF text
// ============================================================

/**
 * Known event type keywords we scan for to identify flight schedule lines.
 * The event field in the PDF is things like "BFM4601", "FRM LEAD", "TAC42S1", etc.
 * We extract the base event type (first 2-4 alpha chars).
 */
const KNOWN_EVENT_BASES = Object.keys(EVENT_TYPES);

/**
 * Extracts the base event type from a raw event string.
 * e.g. "BFM4601" -> "BFM", "FRM LEAD" -> "FRM", "TAC42S1" -> "TAC", "OCF4101" -> "OCF"
 */
function extractEventType(raw: string): string | null {
  const cleaned = raw.trim().toUpperCase();
  // Try longest match first (e.g. BITS before BIT)
  const sorted = [...KNOWN_EVENT_BASES].sort((a, b) => b.length - a.length);
  for (const evt of sorted) {
    if (cleaned.startsWith(evt)) return evt;
  }
  // Check for LEAD / PLAT keywords which indicate the event type is on the next token
  // e.g. "FRM LEAD" — the LEAD is a role, not an event
  return null;
}

/**
 * Parses a 4-digit HHMM time string into an integer.
 * Returns NaN if not a valid time.
 */
function parseTime(s: string): number {
  const n = parseInt(s, 10);
  if (isNaN(n)) return NaN;
  const hh = Math.floor(n / 100);
  const mm = n % 100;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return NaN;
  return n;
}

/**
 * Parses a flight time like "1.3" or "0.7" into a float.
 */
function parseFlightTime(s: string): number {
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/**
 * Main parser: takes the full concatenated PDF text and returns an array of ScheduleLines.
 *
 * Strategy: We look for the pattern of a VT-9 flight line, which has:
 *   - A 3-digit line number
 *   - A callsign like BT11, BT42, etc (BT + 2 digits)
 *   - A 4-digit brief time
 *   - A 4-digit T/O time
 *   - A 4-digit land time
 *   - An event type string
 *   - A flight time like 1.3
 *
 * We use a regex to pull these out.
 */
export function parseScheduleText(pdfPages: string[]): ScheduleLine[] {
  const fullText = pdfPages.join(" ");
  const lines: ScheduleLine[] = [];

  // This regex matches the core numeric/callsign pattern of a flight line.
  // Groups: lineNum, callsign, briefTime, toTime, landTime
  // After landTime we grab everything up to the next flight time pattern (e.g. "1.3")
  const linePattern =
    /(\d{3,4})\s+(BT\d{2})\s+(\d{4})\s+(\d{4})\s+(\d{4})\s+([\s\S]*?)\s+(\d+\.\d)/g;

  let match;
  while ((match = linePattern.exec(fullText)) !== null) {
    const [, lineNumStr, callsign, briefStr, toStr, landStr, middleChunk, ftStr] =
      match;

    const briefTime = parseTime(briefStr);
    const scheduledTO = parseTime(toStr);
    const scheduledLand = parseTime(landStr);
    const flightTime = parseFlightTime(ftStr);

    if (isNaN(briefTime) || isNaN(scheduledTO) || isNaN(scheduledLand)) continue;

    // The middleChunk contains instructor, student, event type, and other fields
    // mixed together. We need to find the event type in there.
    const eventType = extractEventFromChunk(middleChunk);
    if (!eventType) continue; // Skip lines we can't identify an event for

    // Remarks come after the flight time — grab a short window
    const afterMatch = fullText.slice(match.index + match[0].length, match.index + match[0].length + 40);
    const remarks = extractRemarks(afterMatch);

    lines.push({
      lineNum: parseInt(lineNumStr, 10),
      callsign,
      briefTime,
      scheduledTO,
      scheduledLand,
      eventType,
      flightTime,
      remarks,
      rawText: match[0],
    });
  }

  return lines;
}

/**
 * Extracts the event type from the middle chunk of a parsed line.
 * The chunk contains names and the event string mixed together.
 * We look for any token that starts with a known event type.
 */
function extractEventFromChunk(chunk: string): string | null {
  const tokens = chunk.split(/\s+/);
  for (const token of tokens) {
    const evt = extractEventType(token);
    if (evt) return evt;
  }
  // Second pass: check for "LEAD" or "PLAT" preceded by an event type
  // e.g. "FRM LEAD" — FRM is a separate token
  for (let i = 0; i < tokens.length - 1; i++) {
    if (tokens[i + 1] === "LEAD" || tokens[i + 1] === "PLAT") {
      const evt = extractEventType(tokens[i]);
      if (evt) return evt;
    }
  }
  return null;
}

/**
 * Extracts remarks from the text after the flight time.
 * Looks for known remark keywords: RTB, O/I, MB, CRM-F, etc.
 */
function extractRemarks(afterText: string): string {
  const remarkKeywords = ["RTB", "O/I", "MB", "CRM-F", "CS/HS", "HP/HS", "HS/SD", "HS"];
  const found: string[] = [];
  for (const kw of remarkKeywords) {
    if (afterText.includes(kw)) found.push(kw);
  }
  return found.join("; ");
}

// ============================================================
// STEP 2: Group ScheduleLines into Flights
// ============================================================

/**
 * Groups parsed ScheduleLines into Flight objects.
 *
 * Grouping rules:
 * 1. Lines with the same callsign first digit AND same T/O time = same flight.
 * 2. Multiple consecutive lines with the exact same callsign = student swap (single flight, one active window).
 * 3. 2 lines in a group = section. 4 lines = division. 1 line = single.
 */
export function groupIntoFlights(lines: ScheduleLine[]): Flight[] {
  // Sort by T/O time, then by line number
  const sorted = [...lines].sort((a, b) => {
    if (a.scheduledTO !== b.scheduledTO) return a.scheduledTO - b.scheduledTO;
    return a.lineNum - b.lineNum;
  });

  // First pass: detect student swaps (consecutive lines with same callsign)
  // and merge them into a single synthetic line with the full time window
  const merged = mergeStudentSwaps(sorted);

  // Second pass: group by callsign flight number + T/O time
  const groups = new Map<string, ScheduleLine[]>();

  for (const line of merged) {
    const flightDigit = line.callsign[2]; // BT[X]1 — the flight number digit
    const key = `BT${flightDigit}-${line.scheduledTO}`;

    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(line);
  }

  // Third pass: build Flight objects
  const flights: Flight[] = [];

  for (const [key, groupLines] of groups) {
    // Determine flight type
    // A student swap group will have been merged, so count unique positions
    const uniquePositions = new Set(groupLines.map((l) => l.callsign[3]));
    const isStudentSwap = groupLines.some((l) => l.remarks.includes("SWAP"));

    let flightType: "single" | "section" | "division";
    if (uniquePositions.size >= 4) flightType = "division";
    else if (uniquePositions.size >= 2) flightType = "section";
    else flightType = "single";

    // Use the earliest T/O and latest land for the group's active window
    const scheduledTO = Math.min(...groupLines.map((l) => l.scheduledTO));
    const scheduledLand = Math.max(...groupLines.map((l) => l.scheduledLand));
    const briefTime = Math.min(...groupLines.map((l) => l.briefTime));

    // Event type: use the LEAD line's event if available, otherwise first line
    const leadLine = groupLines.find((l) =>
      l.rawText.includes("LEAD")
    );
    const eventType = leadLine?.eventType ?? groupLines[0].eventType;

    flights.push({
      id: key,
      callsign: key.split("-")[0],
      lines: groupLines,
      eventType,
      briefTime,
      scheduledTO,
      scheduledLand,
      flightType,
      isStudentSwap,
    });
  }

  return flights.sort((a, b) => a.scheduledTO - b.scheduledTO);
}

/**
 * Detects consecutive lines with the same callsign (student swaps)
 * and marks them. The grouping step will treat them as one flight.
 */
function mergeStudentSwaps(lines: ScheduleLine[]): ScheduleLine[] {
  const result: ScheduleLine[] = [];
  let i = 0;

  while (i < lines.length) {
    const current = lines[i];
    let j = i + 1;

    // Look ahead: same callsign, same T/O, same land = student swap block
    while (
      j < lines.length &&
      lines[j].callsign === current.callsign &&
      lines[j].scheduledTO === current.scheduledTO &&
      lines[j].scheduledLand === current.scheduledLand
    ) {
      j++;
    }

    if (j - i > 1) {
      // This is a student swap block — keep all lines but mark them
      for (let k = i; k < j; k++) {
        result.push({
          ...lines[k],
          remarks: lines[k].remarks
            ? lines[k].remarks + "; SWAP"
            : "SWAP",
        });
      }
    } else {
      result.push(current);
    }

    i = j;
  }

  return result;
}
