import * as pdfjsLib from "pdfjs-dist";
// Vite-friendly worker URL
import pdfjsWorker from "pdfjs-dist/build/pdf.worker?url";
import mammoth from "mammoth";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

function normalizeText(text: string) {
  return text
    .replace(/\u0000/g, " ")
    .replace(/[\t\f\v]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageTexts: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: any) => (typeof item?.str === "string" ? item.str : ""))
      .join(" ");
    pageTexts.push(text);
  }
  return normalizeText(pageTexts.join("\n\n"));
}

async function extractTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return normalizeText(result.value || "");
}

/**
 * Best-effort document text extraction in the browser.
 * - PDF: pdfjs
 * - DOCX: mammoth
 * - TXT: plain text
 * - DOC: not reliably parseable in-browser; we fall back to text() and sanitize
 */
export async function extractDocumentText(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "pdf") return await extractTextFromPdf(file);
  if (ext === "docx") return await extractTextFromDocx(file);
  if (ext === "txt") return normalizeText(await file.text());

  // Fallback (DOC/unknown): try to read as text and sanitize.
  const raw = await file.text();
  const cleaned = raw.replace(/[^\x20-\x7E\n\r\t]/g, " ");
  return normalizeText(cleaned);
}
