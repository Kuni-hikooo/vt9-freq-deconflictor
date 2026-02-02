"use client";

import { DeconflictResult, Flight } from "@/lib/types";

interface AssignmentTableProps {
  results: DeconflictResult[];
}

function formatTime(hhmm: number): string {
  const h = Math.floor(hhmm / 100);
  const m = hhmm % 100;
  return `${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}`;
}

function formatLineNumbers(res: DeconflictResult): string {
  if (!res.flight.lines || res.flight.lines.length === 0) {
    return "-";
  }
  const lineNums = res.flight.lines.map((line) => line.lineNum);
  return lineNums.join(", ");
}

/**
 * Formats the full callsign display from a flight's individual lines.
 * Examples:
 *   - BT1 with lines BT11, BT12 → "BT 11/12"
 *   - BT8 with lines BT81, BT82, BT83, BT84 → "BT 81/82/83/84"
 *   - Single BT11 → "BT 11"
 */
function formatFullCallsign(flight: Flight): string {
  if (!flight.lines || flight.lines.length === 0) {
    return flight.callsign;
  }

  // Extract the 2-digit position from each callsign (e.g., BT11 → "11")
  const positions = flight.lines.map((line) => line.callsign.slice(2));
  const uniquePositions = [...new Set(positions)].sort();

  if (uniquePositions.length === 0) {
    return flight.callsign;
  }

  // Format as "BT 11/12" or "BT 81/82/83/84"
  return `BT ${uniquePositions.join("/")}`;
}

export function AssignmentTable({ results }: AssignmentTableProps) {
  return (
    <div style={{ marginBottom: 32, overflowX: "auto" }}>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 14,
          color: "var(--text-muted)",
          marginBottom: 12,
          letterSpacing: "0.05em",
        }}
      >
        ASSIGNMENTS
      </h2>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontFamily: "var(--font-mono)",
          fontSize: 12,
        }}
      >
        <thead>
          <tr
            style={{
              background: "var(--surface)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <th style={thStyle}>LINE</th>
            <th style={thStyle}>CALLSIGN</th>
            <th style={thStyle}>EVENT</th>
            <th style={thStyle}>T/O</th>
            <th style={thStyle}>LAND</th>
            <th style={thStyle}>AIRSPACE</th>
            <th style={thStyle}>TACAN</th>
            <th style={thStyle}>FREQ</th>
            <th style={thStyle}>CM</th>
          </tr>
        </thead>
        <tbody>
          {results.map((res) => (
            <tr
              key={res.flight.id}
              style={{
                borderBottom: "1px solid var(--border)",
                background:
                  res.conflicts.length > 0 ? "var(--red-bg)" : "transparent",
              }}
            >
              <td style={tdStyle}>{formatLineNumbers(res)}</td>
              <td style={tdStyle}>{formatFullCallsign(res.flight)}</td>
              <td style={tdStyle}>{res.flight.eventType}</td>
              <td style={tdStyle}>{formatTime(res.flight.scheduledTO)}</td>
              <td style={tdStyle}>{formatTime(res.flight.scheduledLand)}</td>
              <td style={tdStyle}>
                {res.airspace ? res.airspace.physicalBlock : "-"}
              </td>
              <td style={tdStyle}>
                {res.tacan.length > 0
                  ? res.tacan.map((t) => `${t.base}/${t.paired}`).join(", ")
                  : "-"}
              </td>
              <td style={tdStyle}>
                {res.frequencies.presetName || "-"}
              </td>
              <td style={tdStyle}>
                {res.frequencies.cms.length > 0
                  ? res.frequencies.cms.join(", ")
                  : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "10px 8px",
  textAlign: "left",
  color: "var(--text-muted)",
  fontWeight: 600,
  letterSpacing: "0.05em",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 8px",
  color: "var(--text-primary)",
};
