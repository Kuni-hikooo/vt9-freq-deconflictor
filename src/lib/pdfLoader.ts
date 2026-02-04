"use client";

import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker
if (typeof window !== "undefined") {
  // Use unpkg which has proper CORS headers and matches our version
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export async function fetchPdfFromCnatra(date: Date): Promise<ArrayBuffer> {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${d}`;

  // Use our API route to proxy the request (avoids CORS)
  const response = await fetch(`/api/fetch-pdf?date=${dateStr}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch PDF: ${response.status} ${response.statusText}`);
  }

  return response.arrayBuffer();
}

export async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string[]> {
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // Extract items with position info
    const items = textContent.items.map((item: any) => ({
      str: item.str,
      x: item.transform[4],  // X position
      y: item.transform[5],  // Y position
    }));

    // Group items by Y position (rows) with tolerance for slight variations
    const rows = groupByRows(items, 3); // 3pt tolerance

    // Sort rows top-to-bottom (higher Y = higher on page in PDF coords)
    rows.sort((a, b) => b[0].y - a[0].y);

    // Within each row, sort left-to-right by X
    const pageText = rows.map(row => {
      row.sort((a, b) => a.x - b.x);
      return row.map(item => item.str).join(" ");
    }).join("\n");

    pages.push(pageText);
  }

  return pages;
}

function groupByRows(items: Array<{str: string, x: number, y: number}>, tolerance: number) {
  const rows: Array<Array<{str: string, x: number, y: number}>> = [];

  for (const item of items) {
    // Find existing row with similar Y
    const existingRow = rows.find(row =>
      Math.abs(row[0].y - item.y) <= tolerance
    );

    if (existingRow) {
      existingRow.push(item);
    } else {
      rows.push([item]);
    }
  }

  return rows;
}

export async function readUploadedFile(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}
