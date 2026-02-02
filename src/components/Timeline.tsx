"use client";

import { DeconflictResult } from "@/lib/types";

interface TimelineProps {
  results: DeconflictResult[];
}

function formatTime(hhmm: number): string {
  const h = Math.floor(hhmm / 100);
  const m = hhmm % 100;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function Timeline({ results }: TimelineProps) {
  const minTime = Math.min(...results.map((r) => r.flight.scheduledTO));
  const maxTime = Math.max(...results.map((r) => r.flight.scheduledLand));

  const toMinutes = (hhmm: number) =>
    Math.floor(hhmm / 100) * 60 + (hhmm % 100);

  const startMin = toMinutes(minTime);
  const endMin = toMinutes(maxTime);
  const range = endMin - startMin || 60;

  return (
    <div style={{ marginBottom: 32 }}>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 14,
          color: "var(--text-muted)",
          marginBottom: 12,
          letterSpacing: "0.05em",
        }}
      >
        TIMELINE
      </h2>
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: 16,
          position: "relative",
          minHeight: 80,
        }}
      >
        {results.map((res, i) => {
          const left =
            ((toMinutes(res.flight.scheduledTO) - startMin) / range) * 100;
          const width =
            ((toMinutes(res.flight.scheduledLand) -
              toMinutes(res.flight.scheduledTO)) /
              range) *
            100;

          return (
            <div
              key={res.flight.id}
              style={{
                position: "absolute",
                left: `${left}%`,
                width: `${Math.max(width, 2)}%`,
                top: 16 + i * 24,
                height: 18,
                background:
                  res.conflicts.length > 0 ? "var(--red-dim)" : "var(--accent)",
                borderRadius: 3,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                color: res.conflicts.length > 0 ? "var(--red)" : "#0a0e14",
                fontWeight: 600,
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
              title={`${res.flight.callsign} ${formatTime(res.flight.scheduledTO)}-${formatTime(res.flight.scheduledLand)}`}
            >
              {res.flight.callsign}
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 8,
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          color: "var(--text-muted)",
        }}
      >
        <span>{formatTime(minTime)}</span>
        <span>{formatTime(maxTime)}</span>
      </div>
    </div>
  );
}
