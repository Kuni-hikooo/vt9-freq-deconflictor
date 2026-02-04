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

// Color scheme for airspace assignments
const AIRSPACE_COLORS = {
  area4: { bg: "#2563eb", text: "#ffffff" },      // Blue for Area 4
  moa2: { bg: "#7c3aed", text: "#ffffff" },       // Purple for MOA 2
  none: { bg: "#4b5563", text: "#e5e7eb" },       // Gray for no airspace
  conflict: { bg: "var(--red-dim)", text: "var(--red)" },
};

function getFlightColors(res: DeconflictResult): { bg: string; text: string } {
  if (res.conflicts.length > 0) {
    return AIRSPACE_COLORS.conflict;
  }
  if (!res.airspace) {
    return AIRSPACE_COLORS.none;
  }
  return AIRSPACE_COLORS[res.airspace.airspace];
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

  // Generate hour markers for grid lines
  const startHour = Math.floor(minTime / 100);
  const endHour = Math.ceil(maxTime / 100);
  const hourMarkers: number[] = [];
  for (let h = startHour; h <= endHour; h++) {
    const hhmm = h * 100;
    const mins = toMinutes(hhmm);
    if (mins >= startMin && mins <= endMin) {
      hourMarkers.push(hhmm);
    }
  }

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
        {/* Hour grid lines */}
        {hourMarkers.map((hhmm) => {
          const leftPos = ((toMinutes(hhmm) - startMin) / range) * 100;
          return (
            <div
              key={`grid-${hhmm}`}
              style={{
                position: "absolute",
                left: `${leftPos}%`,
                top: 0,
                bottom: 0,
                width: 1,
                background: "var(--border)",
                opacity: 0.5,
                pointerEvents: "none",
              }}
            />
          );
        })}

        {/* Flight bars */}
        {results.map((res, i) => {
          const left =
            ((toMinutes(res.flight.scheduledTO) - startMin) / range) * 100;
          const width =
            ((toMinutes(res.flight.scheduledLand) -
              toMinutes(res.flight.scheduledTO)) /
              range) *
            100;
          const colors = getFlightColors(res);

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
                background: colors.bg,
                borderRadius: 3,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                color: colors.text,
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
              {res.flight.eventType}
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
      {/* Time labels with hour markers */}
      <div
        style={{
          position: "relative",
          marginTop: 8,
          height: 16,
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          color: "var(--text-muted)",
        }}
      >
        {hourMarkers.map((hhmm) => {
          const leftPos = ((toMinutes(hhmm) - startMin) / range) * 100;
          return (
            <span
              key={`label-${hhmm}`}
              style={{
                position: "absolute",
                left: `${leftPos}%`,
                transform: "translateX(-50%)",
              }}
            >
              {formatTime(hhmm)}
            </span>
          );
        })}
      </div>
      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginTop: 12,
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          color: "var(--text-muted)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 12, height: 12, background: AIRSPACE_COLORS.area4.bg, borderRadius: 2 }} />
          <span>Area 4</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 12, height: 12, background: AIRSPACE_COLORS.moa2.bg, borderRadius: 2 }} />
          <span>MOA 2</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 12, height: 12, background: AIRSPACE_COLORS.none.bg, borderRadius: 2 }} />
          <span>No Airspace</span>
        </div>
      </div>
    </div>
  );
}
