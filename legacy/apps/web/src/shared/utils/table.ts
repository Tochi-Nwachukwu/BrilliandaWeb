// Reading a spreadsheet's rows from a CSV file or from cells pasted out of Excel or Google Sheets
// (pasted cells arrive tab-separated), and writing rows back out as CSV.

/** The separator a table uses: tabs when pasted, else commas, or semicolons (Excel in some locales). */
function separatorOf(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  if (firstLine.includes("\t")) return "\t";
  const outside = firstLine.replace(/"[^"]*"/g, "");
  return (outside.match(/;/g)?.length ?? 0) > (outside.match(/,/g)?.length ?? 0) ? ";" : ",";
}

/** Rows of cells. Quoted cells may hold separators, doubled quotes and line breaks. Blank rows are dropped. */
export function parseTable(input: string): string[][] {
  const text = input.replace(/^﻿/, "");
  const sep = separatorOf(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === sep) { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.map((r) => r.map((c) => c.trim())).filter((r) => r.some((c) => c !== ""));
}

/** CSV text for a download; cells with commas, quotes or line breaks are quoted. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const quote = (value: string | number | null | undefined) => {
    const s = value == null ? "" : String(value);
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(quote).join(",")).join("\r\n");
}

/** Offers `rows` as a CSV file to save. The BOM makes Excel read names with accents correctly. */
export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const url = URL.createObjectURL(new Blob(["﻿" + toCsv(rows)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
