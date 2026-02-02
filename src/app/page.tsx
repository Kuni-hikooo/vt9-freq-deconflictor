"use client";

import { useState, useCallback } from "react";
import { fetchPdfFromCnatra, extractTextFromPdf, readUploadedFile } from "@/lib/pdfLoader";
import { parseScheduleText, groupIntoFlights } from "@/lib/parser";
import { runDeconfliction } from "@/lib/deconflict";
import { Flight, DeconflictResult, Conflict, ScheduleLine } from "@/lib/types";
import { DatePicker } from "@/components/DatePicker";
import { UploadZone } from "@/components/UploadZone";
import { Timeline } from "@/components/Timeline";
import { AssignmentTable } from "@/components/AssignmentTable";
import { ConflictPanel } from "@/components/ConflictPanel";
import { SummaryBar } from "@/components/SummaryBar";

type Status = "idle" | "fetching" | "parsing" | "ready" | "error";

export default function App() {
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    // Default to today
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  });
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [rawLines, setRawLines] = useState<ScheduleLine[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [results, setResults] = useState<DeconflictResult[]>([]);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [showUpload, setShowUpload] = useState(false);

  const processBuffer = useCallback(async (buffer: ArrayBuffer) => {
    setStatus("parsing");
    setError(null);
    try {
      const pages = await extractTextFromPdf(buffer);
      const lines = parseScheduleText(pages);

      if (lines.length === 0) {
        setError("No flight events found in this PDF. The format may have changed or this date has no flights.");
        setStatus("error");
        return;
      }

      const grouped = groupIntoFlights(lines);
      const { results: deconflicted, conflicts: foundConflicts } = runDeconfliction(grouped);

      setRawLines(lines);
      setFlights(grouped);
      setResults(deconflicted);
      setConflicts(foundConflicts);
      setStatus("ready");
    } catch (e) {
      setError(`Parse error: ${e instanceof Error ? e.message : "Unknown error"}. You can try uploading the PDF manually.`);
      setStatus("error");
      setShowUpload(true);
    }
  }, []);

  const handleFetch = useCallback(async () => {
    setStatus("fetching");
    setError(null);
    setShowUpload(false);
    try {
      const buffer = await fetchPdfFromCnatra(selectedDate);
      await processBuffer(buffer);
    } catch (e) {
      setError(`Fetch failed: ${e instanceof Error ? e.message : "Unknown error"}. You can upload the PDF manually below.`);
      setStatus("error");
      setShowUpload(true);
    }
  }, [selectedDate, processBuffer]);

  const handleUpload = useCallback(async (file: File) => {
    setStatus("fetching");
    setError(null);
    try {
      const buffer = await readUploadedFile(file);
      await processBuffer(buffer);
    } catch (e) {
      setError(`Upload error: ${e instanceof Error ? e.message : "Unknown error"}`);
      setStatus("error");
      setShowUpload(true);
    }
  }, [processBuffer]);

  const reset = useCallback(() => {
    setStatus("idle");
    setError(null);
    setRawLines([]);
    setFlights([]);
    setResults([]);
    setConflicts([]);
    setShowUpload(false);
  }, []);

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 20px", minHeight: "100vh" }}>
      {/* HEADER */}
      <header style={{ marginBottom: 32, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36,
              border: "2px solid var(--accent)",
              borderRadius: 4,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 18,
              color: "var(--accent)"
            }}>
              VT9
            </div>
            <h1 style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "0.02em",
              lineHeight: 1.2
            }}>
              FREQ DECONFLICTOR
            </h1>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 4, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Airspace · TACAN · ChatterMark
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <DatePicker date={selectedDate} onChange={(d) => { setSelectedDate(d); reset(); }} />
          <button
            onClick={handleFetch}
            disabled={status === "fetching" || status === "parsing"}
            style={{
              background: "var(--accent)",
              color: "#0a0e14",
              border: "none",
              borderRadius: 4,
              padding: "8px 18px",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              fontWeight: 600,
              cursor: status === "fetching" || status === "parsing" ? "not-allowed" : "pointer",
              opacity: status === "fetching" || status === "parsing" ? 0.5 : 1,
              letterSpacing: "0.03em",
              transition: "opacity 0.2s"
            }}
          >
            {status === "fetching" ? "FETCHING..." : status === "parsing" ? "PARSING..." : "FETCH & RUN"}
          </button>
          {status === "ready" && (
            <button onClick={reset} style={{
              background: "transparent",
              color: "var(--text-muted)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              padding: "8px 12px",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              cursor: "pointer"
            }}>
              RESET
            </button>
          )}
        </div>
      </header>

      {/* ERROR + UPLOAD FALLBACK */}
      {error && (
        <div style={{
          background: "var(--red-bg)",
          border: "1px solid var(--red-dim)",
          borderRadius: 6,
          padding: "14px 18px",
          marginBottom: 20,
          display: "flex",
          alignItems: "flex-start",
          gap: 12
        }}>
          <span style={{ color: "var(--red)", fontSize: 18, lineHeight: 1.2 }}>⚠</span>
          <div>
            <p style={{ color: "var(--red)", fontSize: 13, fontWeight: 600 }}>Error</p>
            <p style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 2 }}>{error}</p>
          </div>
        </div>
      )}

      {(showUpload || status === "idle") && (
        <UploadZone onUpload={handleUpload} />
      )}

      {/* RESULTS */}
      {status === "ready" && results.length > 0 && (
        <>
          <SummaryBar
            flights={flights}
            results={results}
            conflicts={conflicts}
            rawLines={rawLines}
          />
          <Timeline results={results} />
          <AssignmentTable results={results} />
          {conflicts.length > 0 && <ConflictPanel conflicts={conflicts} />}
        </>
      )}

      {/* FOOTER */}
      <footer style={{ marginTop: 48, paddingTop: 16, borderTop: "1px solid var(--border)", textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 11, letterSpacing: "0.05em" }}>
          VT-9 TIGERS · NAS MERIDIAN · DECONFLICTION TOOL v1.0
        </p>
      </footer>
    </div>
  );
}
