"use client";

import { Conflict } from "@/lib/types";

interface ConflictPanelProps {
  conflicts: Conflict[];
}

export function ConflictPanel({ conflicts }: ConflictPanelProps) {
  return (
    <div
      style={{
        background: "var(--red-bg)",
        border: "1px solid var(--red-dim)",
        borderRadius: 6,
        padding: 16,
        marginBottom: 32,
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 14,
          color: "var(--red)",
          marginBottom: 12,
          letterSpacing: "0.05em",
        }}
      >
        CONFLICTS ({conflicts.length})
      </h2>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {conflicts.map((conflict, i) => (
          <li
            key={i}
            style={{
              padding: "8px 0",
              borderBottom:
                i < conflicts.length - 1 ? "1px solid var(--red-dim)" : "none",
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              color: "var(--text-secondary)",
            }}
          >
            <span
              style={{
                display: "inline-block",
                background: "var(--red-dim)",
                color: "var(--red)",
                padding: "2px 6px",
                borderRadius: 3,
                fontSize: 10,
                fontWeight: 600,
                marginRight: 8,
                textTransform: "uppercase",
              }}
            >
              {conflict.type.replace(/_/g, " ")}
            </span>
            {conflict.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
