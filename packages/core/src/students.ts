// Students (plan: "Students", "Managing students", "Validation rules"). Checked in the browser and
// again on the server; search and export rules shared by both.
import { z } from "zod";
import { NIGERIAN_STATES, normaliseNigerianPhone } from "./nigeria";

export const STUDENT_STATUSES = ["active", "suspended", "withdrawn", "transferred", "graduated"] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];
export const STATUS_LABEL: Record<StudentStatus, string> = {
  active: "Active",
  suspended: "Suspended",
  withdrawn: "Withdrawn",
  transferred: "Transferred",
  graduated: "Graduated",
};
/** What each status means, for the picker. Real departures change the status so the record survives. */
export const STATUS_DETAIL: Record<StudentStatus, string> = {
  active: "In school and in their class.",
  suspended: "Still on the roll, but not attending for now.",
  withdrawn: "Left the school, for a reason other than the two below.",
  transferred: "Moved to another school.",
  graduated: "Finished their final class.",
};

export const GENDERS = ["MALE", "FEMALE"] as const;
export type StudentGender = (typeof GENDERS)[number];
export const GENDER_LABEL: Record<StudentGender, string> = { MALE: "Male", FEMALE: "Female" };

/** Letters (any script, with marks such as Ọ and ṣ), spaces, hyphens and apostrophes. */
const NAME = /^[\p{L}\p{M}][\p{L}\p{M}' ’-]*$/u;
const name = (label: string) =>
  z
    .string()
    .transform((v) => v.normalize("NFC").trim().replace(/\s+/g, " "))
    .pipe(z.string().min(1, `Enter the ${label}`).max(60, "Use at most 60 characters").regex(NAME, "Letters, spaces, hyphens and apostrophes only"));
const optionalName = z
  .string()
  .transform((v) => v.normalize("NFC").trim().replace(/\s+/g, " "))
  .pipe(z.union([z.literal(""), z.string().max(60, "Use at most 60 characters").regex(NAME, "Letters, spaces, hyphens and apostrophes only")]));

const day = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date")]);
const optionalText = (max: number) => z.string().trim().max(max, `Use at most ${max} characters`);

/** Adding or editing one student (plan: "Adding one student"). */
export const studentSchema = z
  .object({
    firstName: name("first name"),
    lastName: name("last name"),
    otherNames: optionalName,
    gender: z.enum(GENDERS, { error: "Choose Male or Female" }),
    armId: z.string().min(1, "Choose a class"),
    dateOfBirth: day,
    admissionNo: optionalText(30),
    admissionDate: day,
    address: optionalText(200),
    stateOfOrigin: z.union([z.literal(""), z.enum(NIGERIAN_STATES, { error: "Choose a state" })]),
    guardianId: z.string(),
    guardianName: optionalText(120),
    guardianPhone: z.string().trim(),
    guardianEmail: z.union([z.literal(""), z.email("Check this email address")]),
  })
  .superRefine((s, ctx) => {
    if (s.guardianPhone && !normaliseNigerianPhone(s.guardianPhone)) ctx.addIssue({ code: "custom", path: ["guardianPhone"], message: "Enter a Nigerian number, e.g. 0803 000 0001" });
    if (s.dateOfBirth && s.dateOfBirth > new Date().toISOString().slice(0, 10)) ctx.addIssue({ code: "custom", path: ["dateOfBirth"], message: "A birth date can’t be in the future" });
    if ((s.guardianPhone || s.guardianEmail) && !s.guardianName && !s.guardianId) ctx.addIssue({ code: "custom", path: ["guardianName"], message: "Add the guardian’s name too" });
  });
export type StudentInput = z.infer<typeof studentSchema>;

/** "Chiamaka Adaeze Okafor": first, other names, last. */
export function fullName(s: { firstName: string; otherNames?: string | null; lastName: string }): string {
  return [s.firstName, s.otherNames, s.lastName].filter(Boolean).join(" ");
}

/** Lower case with accents and marks removed, so typing Ola finds Ọlá (plan: search ignores accents). */
export function searchKey(text: string): string {
  return text.normalize("NFKD").replace(/[̀-ͯ᷀-᷿]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Does a student match a search? Every word must appear in the name or the admission number. */
export function matchesSearch(student: { fullName: string; admissionNo: string }, query: string): boolean {
  const haystack = searchKey(`${student.fullName} ${student.admissionNo}`);
  return searchKey(query)
    .split(" ")
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

/**
 * One CSV cell. Cells starting with =, +, - or @ get a leading apostrophe so a spreadsheet shows
 * them as text instead of running them as formulas (plan: exports are formula-safe).
 */
export function csvCell(value: string | number | null | undefined): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** A CSV file from a header row and rows, with Windows line endings Excel expects. */
export function toCsv(header: string[], rows: (string | number | null | undefined)[][]): string {
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export const moveStudentsSchema = z.object({ studentIds: z.array(z.string()).min(1, "Pick at least one student"), armId: z.string().min(1, "Choose a class") });
export const statusChangeSchema = z.object({ studentIds: z.array(z.string()).min(1, "Pick at least one student"), status: z.enum(STUDENT_STATUSES) });
