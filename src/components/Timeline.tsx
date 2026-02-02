"use client";

import { useState } from "react";
import { DeconflictResult } from "@/lib/types";

interface TimelineProps {
  results: DeconflictResult[];
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  result: DeconflictResult | null;
}

function formatTime(hhmm: number): string {
  const h = Math.floor(hhmm / 100);
  const m = hhmm % 100;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function Timeline({ results }: TimelineProps) {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    result: null,
  });

  const minTime = Math.min(...results.map((r) => r.flight.scheduledTO));
  const maxTime = Math.max(...results.map((r) => r.flight.scheduledLand));

  const toMinutes = (hhmm: number) =>
    Math.floor(hhmm / 100) * 60 + (hhmm % 100);

  const startMin = toMinutes(minTime);
  const endMin = toMinutes(maxTime);
  const range = endMin - startMin || 60;

  // Calculate dynamic container height based on flight count
  const containerHeight = Math.max(80, 16 + results.length * 24 + 18);

  const handleMouseEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    res: DeconflictResult
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      result: res,
    });
  };

  const handleMouseLeave = () => {
    setTooltip({ visible: false, x: 0, y: 0, result: null });
  };

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
          height: containerHeight,
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
              onMouseEnter={(e) => handleMouseEnter(e, res)}
              onMouseLeave={handleMouseLeave}
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
                cursor: "pointer",
                transition: "transform 0.1s, box-shadow 0.1s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "scale(1.05)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {res.flight.callsign}
            </div>
          );
        })}

        {/* Tooltip */}
        {tooltip.visible && tooltip.result && (
          <div
            style={{
              position: "fixed",
              left: tooltip.x,
              top: tooltip.y,
              transform: "translate(-50%, -100%)",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "8px 12px",
              zIndex: 1000,
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
              pointerEvents: "none",
              minWidth: 160,
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--text-primary)",
                fontWeight: 600,
                marginBottom: 6,
              }}
            >
              {tooltip.result.flight.callsign}
            </div>
            <div
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                color: "var(--text-muted)",
                lineHeight: 1.6,
              }}
            >
              <div>T/O: {formatTime(tooltip.result.flight.scheduledTO)}</div>
              <div>Land: {formatTime(tooltip.result.flight.scheduledLand)}</div>
              <div>Event: {tooltip.result.flight.eventType}</div>
              <div>
                Airspace:{" "}
                {tooltip.result.airspace
                  ? tooltip.result.airspace.physicalBlock
                  : "-"}
              </div>
            </div>
          </div>
        )}
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
