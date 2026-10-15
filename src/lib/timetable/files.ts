// Timetable files in the browser (batch 22): the Excel template, and reading what a school uploads.
// Excel, CSV and Word tables become lessons; a PDF is kept as a document. The Excel and Word
// readers load only when a file of that kind is picked.
import { DAYS, DAY_NAME, shortTime, type Period } from "@brillianda/core/timetable";
import { parseCsv, readDocx, readXlsxSheets } from "@/lib/import/readFile";

export type PickedTimetable =
  | { ok: true; kind: "grid"; sheets: { name: string; rows: string[][] }[] }
  | { ok: true; kind: "pdf"; file: File }
  | { ok: false; message: string };

export async function readTimetableFile(file: File): Promise<PickedTimetable> {
  const name = file.name.toLowerCase();
  try {
    if (name.endsWith(".pdf") || file.type === "application/pdf") return { ok: true, kind: "pdf", file };
    if (name.endsWith(".csv") || file.type === "text/csv") return { ok: true, kind: "grid", sheets: [{ name: "", rows: parseCsv(await file.text()) }] };
    if (name.endsWith(".xlsx")) return { ok: true, kind: "grid", sheets: await readXlsxSheets(await file.arrayBuffer()) };
    if (name.endsWith(".docx")) {
      const rows = await readDocx(await file.arrayBuffer());
      return rows ? { ok: true, kind: "grid", sheets: [{ name: "", rows }] } : { ok: false, message: "This Word document has no table. Put the timetable in a table: days down the side, periods across the top." };
    }
    if (name.endsWith(".xls")) return { ok: false, message: "This is an old Excel file (.xls). Open it in Excel, choose Save As, pick Excel Workbook (.xlsx), and upload that." };
    if (name.endsWith(".doc")) return { ok: false, message: "This is an old Word file (.doc). Open it in Word, choose Save As, pick Word Document (.docx), and upload that." };
    return { ok: false, message: "Upload an Excel (.xlsx), CSV, Word (.docx) or PDF file." };
  } catch {
    return { ok: false, message: "We couldn’t read this file. Is it open in another program, or damaged? Try saving it again." };
  }
}

/** "Period 1 (8:00–8:40)", the template's column heading, which the reader matches back by name. */
export const periodHeading = (p: Period) => `${p.label} (${shortTime(p.start)}–${shortTime(p.end)})`;

/** Excel forbids some characters in sheet names and cuts them at 31. */
const sheetName = (label: string) => label.replace(/[\\/?*[\]:]/g, " ").slice(0, 31);

/**
 * A sheet per class, days down the side and periods across the top, filled with today's lessons
 * and a dropdown of each class's subjects. The upload matches sheets back to classes by name.
 */
export async function downloadTimetableTemplate(
  schoolName: string,
  periods: Period[],
  classes: { id: string; label: string; subjects: string[]; lessons: Map<string, string> }[],
) {
  const { default: ExcelJS } = await import("exceljs");
  const book = new ExcelJS.Workbook();
  book.creator = "Brillianda";
  const lists = book.addWorksheet("Lists", { state: "veryHidden" });

  classes.forEach((c, i) => {
    const sheet = book.addWorksheet(sheetName(c.label), { views: [{ state: "frozen", xSplit: 1, ySplit: 1 }] });
    sheet.columns = [{ header: "Day", key: "day", width: 13 }, ...periods.map((p) => ({ header: periodHeading(p), key: p.id, width: p.kind === "break" ? 10 : 22 }))];
    const head = sheet.getRow(1);
    head.font = { bold: true };
    head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECE7FF" } };
    // This class's subjects, for the dropdowns.
    const col = lists.getColumn(i + 1);
    c.subjects.forEach((s, r) => (lists.getCell(r + 1, i + 1).value = s));
    const letter = col.letter;
    for (const day of DAYS) {
      const row = sheet.addRow({ day: DAY_NAME[day], ...Object.fromEntries(periods.map((p) => [p.id, p.kind === "break" ? p.label : (c.lessons.get(`${day}|${p.id}`) ?? "")])) });
      periods.forEach((p, k) => {
        const cell = row.getCell(k + 2);
        if (p.kind === "break") {
          cell.font = { italic: true, color: { argb: "FF8A84A0" } };
          return;
        }
        if (c.subjects.length) cell.dataValidation = { type: "list", allowBlank: true, formulae: [`Lists!$${letter}$1:$${letter}$${c.subjects.length}`] };
      });
    }
  });

  const data = await book.xlsx.writeBuffer();
  const blob = new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${schoolName} timetable.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export { sheetName };
