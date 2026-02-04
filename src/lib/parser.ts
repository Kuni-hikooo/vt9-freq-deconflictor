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
 * Handles spaces from PDF extraction: "06 15" → 615, "0815" → 815
 * Returns NaN if not a valid time.
 */
function parseTime(s: string): number {
  // Remove any spaces from PDF extraction
  const cleaned = s.replace(/\s+/g, "");
  const n = parseInt(cleaned, 10);
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
 * Normalizes a callsign by removing all spaces.
 * "BT 3 2" → "BT32", "BT11" → "BT11"
 */
function normalizeCallsign(raw: string): string {
  return raw.replace(/\s+/g, "");
}

/**
 * Expands a combined callsign like "BT21/22" into individual callsigns ["BT21", "BT22"].
 * Also handles longer combinations like "BT81/82/83/84" → ["BT81", "BT82", "BT83", "BT84"].
 * Handles spaces from PDF extraction: "BT 21 / 22" → ["BT21", "BT22"]
 */
function expandCombinedCallsign(raw: string): string[] {
  // First normalize by removing all spaces
  const normalized = normalizeCallsign(raw);

  if (!normalized.includes("/")) return [normalized];

  // "BT21/22" → base="BT2", positions=["1", "22"]
  // "BT81/82/83/84" → base="BT8", positions=["1", "82", "83", "84"]
  const base = normalized.slice(0, 3); // "BT2" or "BT8"
  const remainder = normalized.slice(3); // "1/22" or "1/82/83/84"
  const positions = remainder.split("/");

  return positions.map((pos) => {
    // Handle both "1" (single digit) and "22" (two digit) formats
    // If it's a two-digit number, use it directly; if single digit, prefix with base
    if (pos.length === 2) {
      return "BT" + pos;
    } else {
      // Single digit: combine with base's last digit
      return base + pos;
    }
  });
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
  // Join pages with newlines (not spaces) to preserve row structure
  const fullText = pdfPages.join("\n");
  const lines: ScheduleLine[] = [];

  // This regex matches the core numeric/callsign pattern of a flight line.
  // Groups: lineNum, callsign, briefTime, toTime, landTime
  // After landTime we grab everything up to the next flight time pattern (e.g. "1.3")
  // Updated to handle combined callsigns like "BT21/22" or "BT81/82/83/84"
  // Also handles spaces in callsigns from PDF extraction: "BT 32", "BT 5 1", etc.
  // Also handles spaces in times from PDF extraction: "06 15" instead of "0615"
  const linePattern =
    /(\d{3,4})\s+(BT\s*\d\s*\d(?:\s*\/\s*\d\s*\d)*)\s+(\d{2}\s*\d{2})\s+(\d{2}\s*\d{2})\s+(\d{2}\s*\d{2})\s+([\s\S]*?)\s+(\d+\.\d)/g;

  let match;
  while ((match = linePattern.exec(fullText)) !== null) {
    const [, lineNumStr, rawCallsign, briefStr, toStr, landStr, middleChunk, ftStr] =
      match;

    const briefTime = parseTime(briefStr);
    const scheduledTO = parseTime(toStr);
    const scheduledLand = parseTime(landStr);
    const flightTime = parseFlightTime(ftStr);

    if (isNaN(briefTime) || isNaN(scheduledTO) || isNaN(scheduledLand)) continue;

    // The middleChunk contains instructor, student, event type, and other fields
    // mixed together. We need to find the event type in there.
    const eventResult = extractEventFromChunk(middleChunk);
    if (!eventResult) continue; // Skip lines we can't identify an event for

    const { eventType, fullCode: fullEventCode } = eventResult;

    // Remarks come after the flight time — grab a short window
    const afterMatch = fullText.slice(match.index + match[0].length, match.index + match[0].length + 40);
    const remarks = extractRemarks(afterMatch);

    // Expand combined callsigns (e.g., "BT21/22" → ["BT21", "BT22"])
    const callsigns = expandCombinedCallsign(rawCallsign);

    for (const callsign of callsigns) {
      lines.push({
        lineNum: parseInt(lineNumStr, 10),
        callsign,
        briefTime,
        scheduledTO,
        scheduledLand,
        eventType,
        fullEventCode,
        flightTime,
        remarks,
        rawText: match[0],
      });
    }
  }

  return lines;
}

/**
 * Extracts the event type and full event code from the middle chunk of a parsed line.
 * The chunk contains names and the event string mixed together.
 * We look for any token that starts with a known event type.
 * Returns { eventType, fullCode } or null if not found.
 */
function extractEventFromChunk(chunk: string): { eventType: string; fullCode: string } | null {
  const tokens = chunk.split(/\s+/);
  for (const token of tokens) {
    const evt = extractEventType(token);
    if (evt) return { eventType: evt, fullCode: token.toUpperCase() };
  }
  // Second pass: check for "LEAD" or "PLAT" preceded by an event type
  // e.g. "FRM LEAD" — FRM is a separate token
  for (let i = 0; i < tokens.length - 1; i++) {
    if (tokens[i + 1] === "LEAD" || tokens[i + 1] === "PLAT") {
      const evt = extractEventType(tokens[i]);
      if (evt) return { eventType: evt, fullCode: tokens[i].toUpperCase() + " " + tokens[i + 1].toUpperCase() };
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
    const fullEventCode = leadLine?.fullEventCode ?? groupLines[0].fullEventCode;

    flights.push({
      id: key,
      callsign: key.split("-")[0],
      lines: groupLines,
      eventType,
      fullEventCode,
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
