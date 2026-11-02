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

/**
 * The whole school on one sheet, laid out like a printed timetable: for each day, a row per class,
 * and the bell schedule's periods across the top (breaks shaded). Filled with today's lessons, with
 * a dropdown of each class's subjects. The upload reads it back by each column's start time.
 */
export async function downloadMasterTemplate(
  schoolName: string,
  periods: Period[],
  classes: { id: string; label: string; subjects: string[]; lessons: Map<string, string> }[],
) {
  const { default: ExcelJS } = await import("exceljs");
  const book = new ExcelJS.Workbook();
  book.creator = "Brillianda";
  const lists = book.addWorksheet("Lists", { state: "veryHidden" });
  const sheet = book.addWorksheet("Timetable", { views: [{ state: "frozen", xSplit: 2, ySplit: 2 }], pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 } });
  const last = periods.length + 2;

  sheet.columns = [{ width: 9 }, { width: 11 }, ...periods.map((p) => ({ width: p.kind === "break" ? 9 : 13 }))];
  sheet.mergeCells(1, 1, 1, last);
  const title = sheet.getCell(1, 1);
  title.value = `${schoolName}: weekly timetable`.toUpperCase();
  title.font = { bold: true, size: 14 };
  title.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 26;

  const head = sheet.getRow(2);
  head.values = ["DAYS", "Time/Class", ...periods.map((p) => `${shortTime(p.start)}–${shortTime(p.end)}`)];
  head.font = { bold: true };
  head.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  head.height = 32;
  head.eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECE7FF" } };
    cell.border = { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } };
  });

  // Each class's subjects, for the dropdowns.
  classes.forEach((c, i) => c.subjects.forEach((s, r) => (lists.getCell(r + 1, i + 1).value = s)));

  let row = 3;
  for (const day of DAYS) {
    const first = row;
    classes.forEach((c, i) => {
      const r = sheet.getRow(row++);
      r.getCell(2).value = c.label;
      r.getCell(2).alignment = { horizontal: "center" };
      periods.forEach((p, k) => {
        const cell = r.getCell(k + 3);
        cell.alignment = { horizontal: "center" };
        if (p.kind === "break") {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0F0F2" } };
          return;
        }
        cell.value = c.lessons.get(`${day}|${p.id}`) ?? "";
        if (c.subjects.length) {
          const letter = lists.getColumn(i + 1).letter;
          cell.dataValidation = { type: "list", allowBlank: true, formulae: [`Lists!${letter}$1:${letter}${c.subjects.length}`] };
        }
      });
      for (let k = 1; k <= last; k++) r.getCell(k).border = { top: { style: "hair" }, bottom: { style: "hair" }, left: { style: "thin" }, right: { style: "thin" } };
    });
    if (classes.length) {
      sheet.mergeCells(first, 1, row - 1, 1);
      const dayCell = sheet.getCell(first, 1);
      dayCell.value = DAY_NAME[day].slice(0, 3).toUpperCase();
      dayCell.font = { bold: true };
      dayCell.alignment = { horizontal: "center", vertical: "middle" };
      for (let k = 1; k <= last; k++) sheet.getCell(row - 1, k).border = { ...sheet.getCell(row - 1, k).border, bottom: { style: "medium" } };
    }
  }

  const data = await book.xlsx.writeBuffer();
  const blob = new Blob([data], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${schoolName} full timetable.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export { sheetName };
