"use client";

import { buildCnataraUrl } from "@/config/vt9Config";
import * as pdfjsLib from "pdfjs-dist";

// Set the worker source
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

export async function fetchPdfFromCnatra(date: Date): Promise<ArrayBuffer> {
  const url = buildCnataraUrl(date);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
  }
  return response.arrayBuffer();
}

export async function extractTextFromPdf(buffer: ArrayBuffer): Promise<string[]> {
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
    pages.push(pageText);
  }

  return pages;
}

export async function readUploadedFile(file: File): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}
