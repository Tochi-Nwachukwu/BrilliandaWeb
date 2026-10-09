// The Excel templates (plan: "The templates"). A whole-school template has Class and Arm columns
// whose dropdowns hold the school's own names; a per-class template needs neither.
import { NIGERIAN_STATES } from "@brillianda/core/nigeria";
import { IMPORT_COLUMNS, type ImportArm, type ImportLevel } from "@brillianda/core/studentImport";

const EXAMPLES: Record<string, string> = {
  firstName: "Chiamaka",
  lastName: "Okafor",
  otherNames: "Adaeze",
  gender: "Female",
  dateOfBirth: "14/03/2014",
  admissionNo: "",
  admissionDate: "08/09/2025",
  guardianName: "Ngozi Okafor",
  guardianPhone: "0803 000 0001",
  guardianEmail: "ngozi@example.com",
  address: "12 Aba Road, Port Harcourt",
  stateOfOrigin: "Anambra",
};

const columnLetter = (n: number) => {
  let s = "";
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  return s;
};

/** Builds the template and starts the download. `forClass` makes the per-class template. */
export async function downloadTemplate(schoolName: string, levels: ImportLevel[], arms: ImportArm[], forClass?: { label: string }) {
  const { default: ExcelJS } = await import("exceljs");
  const book = new ExcelJS.Workbook();
  book.creator = "Brillianda";
  const sheet = book.addWorksheet("Students", { views: [{ state: "frozen", ySplit: 1 }] });
  const lists = book.addWorksheet("Lists", { state: "veryHidden" });

  const columns = IMPORT_COLUMNS.filter((c) => c.id !== "fullName" && (!forClass || (c.id !== "className" && c.id !== "armName")));
  sheet.columns = columns.map((c) => ({ header: c.label, key: c.id, width: Math.max(14, c.label.length + 4) }));
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFECE7FF" } };

  // The school's own names for the dropdowns, kept on a hidden sheet.
  const armNames = [...new Set(arms.map((a) => a.name))];
  const fill = (col: number, values: string[]) => values.forEach((v, i) => (lists.getCell(i + 1, col).value = v));
  fill(1, levels.map((l) => l.name));
  fill(2, armNames);
  fill(3, ["Male", "Female"]);
  fill(4, [...NIGERIAN_STATES]);
  const listRef = (col: number, count: number) => `Lists!$${columnLetter(col)}$1:$${columnLetter(col)}$${Math.max(1, count)}`;
  const dropdowns: Record<string, string> = {
    className: listRef(1, levels.length),
    armName: listRef(2, armNames.length),
    gender: listRef(3, 2),
    stateOfOrigin: listRef(4, NIGERIAN_STATES.length),
  };

  const example: Record<string, string> = { ...EXAMPLES, className: levels[0]?.name ?? "", armName: arms.find((a) => a.levelId === levels[0]?.id)?.name ?? "" };
  sheet.addRow(Object.fromEntries(columns.map((c) => [c.id, example[c.id] ?? ""])));
  sheet.getRow(2).font = { italic: true, color: { argb: "FF6E6787" } };

  columns.forEach((c, i) => {
    const letter = columnLetter(i + 1);
    const formula = dropdowns[c.id];
    for (let r = 2; r <= 2001; r++) {
      const cell = sheet.getCell(`${letter}${r}`);
      if (formula) cell.dataValidation = { type: "list", allowBlank: true, formulae: [formula], showErrorMessage: c.id !== "armName", errorTitle: c.label, error: `Pick a ${c.label.toLowerCase()} from the list.` };
      if (c.id === "dateOfBirth" || c.id === "admissionDate" || c.id === "guardianPhone" || c.id === "admissionNo") cell.numFmt = "@";
    }
  });
  sheet.getCell("A1").note = `Row 2 is an example: replace it with your first student.${forClass ? ` Everyone in this file goes into ${forClass.label}.` : ""} Dates are day first, like 14/03/2014.`;

  const buffer = await book.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const safe = (s: string) => s.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const a = Object.assign(document.createElement("a"), { href: url, download: `${safe(schoolName)}-${forClass ? safe(forClass.label) : "students"}-template.xlsx` });
  a.click();
  URL.revokeObjectURL(url);
}
