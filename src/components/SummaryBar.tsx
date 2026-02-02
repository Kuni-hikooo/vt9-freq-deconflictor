"use client";

import { Flight, DeconflictResult, Conflict, ScheduleLine } from "@/lib/types";

interface SummaryBarProps {
  flights: Flight[];
  results: DeconflictResult[];
  conflicts: Conflict[];
  rawLines: ScheduleLine[];
}

export function SummaryBar({
  flights,
  results,
  conflicts,
  rawLines,
}: SummaryBarProps) {
  const successCount = results.filter((r) => r.conflicts.length === 0).length;

  return (
    <div
      style={{
        display: "flex",
        gap: 24,
        marginBottom: 24,
        padding: "16px 20px",
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        flexWrap: "wrap",
      }}
    >
      <Stat label="Lines Parsed" value={rawLines.length} />
      <Stat label="Flights" value={flights.length} />
      <Stat label="Assigned" value={successCount} color="var(--green)" />
      <Stat label="Conflicts" value={conflicts.length} color={conflicts.length > 0 ? "var(--red)" : undefined} />
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          color: "var(--text-muted)",
          letterSpacing: "0.05em",
          marginBottom: 4,
        }}
      >
        {label.toUpperCase()}
      </div>
      <div
        style={{
          fontSize: 24,
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          color: color || "var(--text-primary)",
        }}
      >
        {value}
      </div>
    </div>
  );
}
