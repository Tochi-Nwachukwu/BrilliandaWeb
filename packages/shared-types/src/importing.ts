import type { Gender } from "./admin";

// Reading a school's own student list (DECISIONS.md F-41). Shared by the web app, which guesses the
// columns, and the API, which checks every row, so both read a cell the same way.

/** What a column can hold. A name can come whole, or as surname / first name / other names. */
export const IMPORT_FIELDS = [
  { id: "fullName", label: "Full name", aliases: ["full name", "name", "student name", "names", "student", "name of student", "pupil name"] },
  { id: "surname", label: "Surname", aliases: ["surname", "last name", "family name", "lastname"] },
  { id: "firstName", label: "First name", aliases: ["first name", "firstname", "given name", "forename"] },
  { id: "otherNames", label: "Other names", aliases: ["other names", "other name", "middle name", "middle names", "othernames"] },
  { id: "className", label: "Class", aliases: ["class", "arm", "class arm", "form", "class name", "current class"] },
  { id: "admissionNo", label: "Admission number", aliases: ["admission number", "admission no", "adm no", "admno", "reg no", "registration number", "student id", "admission"] },
  { id: "gender", label: "Gender", aliases: ["gender", "sex", "m/f"] },
  { id: "dob", label: "Date of birth", aliases: ["date of birth", "dob", "birth date", "birthday", "d.o.b"] },
  { id: "guardianName", label: "Parent's name", aliases: ["parent name", "parent's name", "guardian", "guardian name", "parent", "parent/guardian", "name of parent"] },
  { id: "guardianPhone", label: "Parent's phone", aliases: ["parent phone", "phone", "phone number", "guardian phone", "parent's phone", "mobile", "telephone", "gsm"] },
  { id: "guardianEmail", label: "Parent's email", aliases: ["parent email", "email", "guardian email", "parent's email", "e-mail", "email address"] },
] as const;

export type ImportFieldId = (typeof IMPORT_FIELDS)[number]["id"];

const simplify = (text: string) => text.toLowerCase().replace(/[_.]+/g, " ").replace(/[^a-z0-9/' ]+/g, "").replace(/\s+/g, " ").trim();

/** The field a column heading most likely means, or null to leave the column out. */
export function guessImportField(heading: string): ImportFieldId | null {
  const h = simplify(heading);
  if (!h) return null;
  for (const field of IMPORT_FIELDS) if ((field.aliases as readonly string[]).includes(h)) return field.id;
  // Headings like "Student's Full Name" or "Father's Phone No".
  if (/phone|mobile|gsm/.test(h)) return "guardianPhone";
  if (/mail/.test(h)) return "guardianEmail";
  if (/parent|guardian|father|mother/.test(h)) return "guardianName";
  if (/birth|dob/.test(h.replace(/ /g, ""))) return "dob";
  if (/adm|reg/.test(h)) return "admissionNo";
  if (/surname|last/.test(h)) return "surname";
  if (/first/.test(h)) return "firstName";
  if (/other|middle/.test(h)) return "otherNames";
  if (/class|arm/.test(h)) return "className";
  if (/sex|gender/.test(h)) return "gender";
  if (/name/.test(h)) return "fullName";
  return null;
}

/** "M", "Male", "boy" → MALE; blank → null; anything else is a problem (undefined). */
export function readGender(cell: string): Gender | null | undefined {
  const c = cell.trim().toLowerCase();
  if (!c) return null;
  if (["m", "male", "boy", "b"].includes(c)) return "MALE";
  if (["f", "female", "girl", "g"].includes(c)) return "FEMALE";
  return undefined;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/**
 * A date as schools write it, day first: 14/03/2014, 14-3-2014, 14.03.14, 14 March 2014, or
 * 2014-03-14. Returns YYYY-MM-DD, null when blank, or undefined when it can't be read.
 */
export function readDate(cell: string): string | null | undefined {
  const c = cell.trim();
  if (!c) return null;
  let day: number, month: number, year: number;
  let m: RegExpMatchArray | null;
  if ((m = c.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else if ((m = c.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/))) [day, month, year] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else if ((m = c.match(/^(\d{1,2})(?:st|nd|rd|th)?[\s-]+([a-z]+)[\s,-]+(\d{4})$/i))) {
    const index = MONTHS.indexOf(m[2]!.slice(0, 3).toLowerCase());
    if (index < 0) return undefined;
    [day, month, year] = [Number(m[1]), index + 1, Number(m[3])];
  } else return undefined;
  if (year < 100) year += year > 50 ? 1900 : 2000;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * A class written any common way, reduced so it can be compared with the school's arm names:
 * "JSS1 A", "jss 1a", "J.S.S. 1A" and "JS1A" all become "jss1a"; "SSS 2B" and "S.S. 2 B" become "ss2b".
 */
export function classKey(cell: string): string {
  const k = cell.toLowerCase().replace(/[^a-z0-9]/g, "");
  return k.replace(/^js(?=\d)/, "jss").replace(/^sss(?=\d)/, "ss").replace(/^jss?s(?=\d)/, "jss");
}

/** The full name from whichever name columns a list has: "Okafor", "Chidera", "Ngozi" → "Chidera Ngozi Okafor". */
export function joinName(parts: { fullName?: string; surname?: string; firstName?: string; otherNames?: string }): string {
  const tidy = (s?: string) => (s ?? "").trim().replace(/\s+/g, " ");
  if (tidy(parts.fullName)) return tidy(parts.fullName);
  return [tidy(parts.firstName), tidy(parts.otherNames), tidy(parts.surname)].filter(Boolean).join(" ");
}
