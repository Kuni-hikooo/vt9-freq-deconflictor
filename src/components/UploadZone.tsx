"use client";

import { useCallback } from "react";

interface UploadZoneProps {
  onUpload: (file: File) => void;
}

export function UploadZone({ onUpload }: UploadZoneProps) {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type === "application/pdf") {
        onUpload(file);
      }
    },
    [onUpload]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onUpload(file);
      }
    },
    [onUpload]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      style={{
        border: "2px dashed var(--border)",
        borderRadius: 8,
        padding: "40px 20px",
        textAlign: "center",
        marginBottom: 24,
        background: "var(--surface)",
      }}
    >
      <p style={{ color: "var(--text-secondary)", marginBottom: 12 }}>
        Drop a VT-9 schedule PDF here, or click to select
      </p>
      <input
        type="file"
        accept=".pdf"
        onChange={handleChange}
        style={{ display: "none" }}
        id="pdf-upload"
      />
      <label
        htmlFor="pdf-upload"
        style={{
          display: "inline-block",
          background: "var(--accent)",
          color: "#0a0e14",
          padding: "8px 16px",
          borderRadius: 4,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        SELECT PDF
      </label>
    </div>
  );
}
