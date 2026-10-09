// Reading a school's student list in the browser (plan: "The browser parses it, so the preview
// appears at once even on a slow connection"). CSV, Excel (.xlsx) and Word tables (.docx). The
// Excel and Word readers load only when a file of that kind is picked.
import { MAX_IMPORT_ROWS } from "@brillianda/core/studentImport";

export type Sheet = { headings: string[]; rows: string[][] };
export type ReadResult = { ok: true; sheet: Sheet } | { ok: false; message: string };

/** CSV as spreadsheets write it: quoted cells, doubled quotes, commas and line breaks inside quotes. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const input = text.replace(/^﻿/, "");
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

const isoDay = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;

/** An Excel cell as text. Date cells become 2014-03-14, so they are never read the wrong way round. */
function cellText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return isoDay(value);
  if (typeof value === "object") {
    const v = value as { text?: unknown; result?: unknown; richText?: { text: string }[]; hyperlink?: string };
    if (v.richText) return v.richText.map((r) => r.text).join("");
    if (v.result !== undefined) return cellText(v.result);
    if (typeof v.text === "string") return v.text;
    return "";
  }
  return String(value);
}

async function readXlsx(buffer: ArrayBuffer): Promise<string[][]> {
  const { default: ExcelJS } = await import("exceljs");
  const book = new ExcelJS.Workbook();
  await book.xlsx.load(buffer);
  // The first visible sheet: our template keeps its dropdown lists on a hidden one.
  const sheet = book.worksheets.find((s) => s.state === "visible") ?? book.worksheets[0];
  if (!sheet) return [];
  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      cells[col - 1] = cellText(cell.value).trim();
    });
    rows.push(Array.from(cells, (c) => c ?? ""));
  });
  return rows;
}

/** The first table in a Word document, one row per table row. Paragraphs in a cell join with a space. */
async function readDocx(buffer: ArrayBuffer): Promise<string[][] | null> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) return null;
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const table = doc.getElementsByTagNameNS(W, "tbl")[0];
  if (!table) return null;
  return Array.from(table.getElementsByTagNameNS(W, "tr")).map((tr) =>
    Array.from(tr.getElementsByTagNameNS(W, "tc")).map((tc) =>
      Array.from(tc.getElementsByTagNameNS(W, "p"))
        .map((p) => Array.from(p.getElementsByTagNameNS(W, "t")).map((t) => t.textContent ?? "").join(""))
        .filter(Boolean)
        .join(" ")
        .trim(),
    ),
  );
}

/** The heading row is the first row with at least two filled cells; empty rows are dropped. */
function toSheet(rows: string[][]): ReadResult {
  const filled = rows.map((r) => r.map((c) => (c ?? "").trim())).filter((r) => r.some(Boolean));
  const headIndex = filled.findIndex((r) => r.filter(Boolean).length >= 2);
  if (headIndex < 0) return { ok: false, message: "This file has no table of students. Put one student per row, with a heading row on top." };
  const headings = filled[headIndex]!;
  const body = filled.slice(headIndex + 1).map((r) => headings.map((_, i) => r[i] ?? ""));
  if (!body.length) return { ok: false, message: "The file has headings but no students under them." };
  if (body.length > MAX_IMPORT_ROWS) return { ok: false, message: `This file has ${body.length.toLocaleString()} students. Import up to ${MAX_IMPORT_ROWS.toLocaleString()} at a time: split it into two files.` };
  return { ok: true, sheet: { headings, rows: body } };
}

/** Reads a picked file into headings and rows, or says plainly why it can't. */
export async function readStudentFile(file: File): Promise<ReadResult> {
  const name = file.name.toLowerCase();
  try {
    if (name.endsWith(".csv") || file.type === "text/csv") return toSheet(parseCsv(await file.text()));
    if (name.endsWith(".xlsx")) return toSheet(await readXlsx(await file.arrayBuffer()));
    if (name.endsWith(".docx")) {
      const rows = await readDocx(await file.arrayBuffer());
      return rows ? toSheet(rows) : { ok: false, message: "This Word document has no table. Put the students in a table, one per row, with a heading row on top." };
    }
    if (name.endsWith(".xls")) return { ok: false, message: "This is an old Excel file (.xls). Open it in Excel, choose Save As, pick Excel Workbook (.xlsx), and upload that." };
    if (name.endsWith(".doc")) return { ok: false, message: "This is an old Word file (.doc). Open it in Word, choose Save As, pick Word Document (.docx), and upload that." };
    return { ok: false, message: "Upload an Excel (.xlsx), CSV or Word (.docx) file." };
  } catch {
    return { ok: false, message: "We couldn’t read this file. Is it open in another program, or damaged? Try saving it again." };
  }
}
