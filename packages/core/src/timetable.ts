// The school timetable (user request, 15 Oct 2026): a bell schedule, Monday to Friday, and each
// class's subject in each lesson period. Teachers see it with their own lessons highlighted, because
// a lesson's teacher is the class's teacher for that subject. A school can split its timetable into
// groups of class sections (user request, 30 Oct 2026): Primary on its own, JSS and SSS together, or
// JSS and SSS apart. Each group has its own bell schedule and document.
import { z } from "zod";
import type { Section } from "./classes";

export const DAYS = [1, 2, 3, 4, 5] as const;
export type Day = (typeof DAYS)[number];
export const DAY_NAME: Record<Day, string> = { 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday" };
export const DAY_SHORT: Record<Day, string> = { 1: "Mon", 2: "Tue", 3: "Wed", 4: "Thu", 5: "Fri" };

/** One period of the school day. Breaks have no lessons. Times are "HH:MM", 24-hour. */
export type Period = { id: string; label: string; start: string; end: string; kind: "lesson" | "break" };

/** A common Nigerian secondary day: eight 40-minute lessons, a short break and lunch. */
export const DEFAULT_PERIODS: Period[] = [
  { id: "p1", label: "Period 1", start: "08:00", end: "08:40", kind: "lesson" },
  { id: "p2", label: "Period 2", start: "08:40", end: "09:20", kind: "lesson" },
  { id: "p3", label: "Period 3", start: "09:20", end: "10:00", kind: "lesson" },
  { id: "b1", label: "Break", start: "10:00", end: "10:20", kind: "break" },
  { id: "p4", label: "Period 4", start: "10:20", end: "11:00", kind: "lesson" },
  { id: "p5", label: "Period 5", start: "11:00", end: "11:40", kind: "lesson" },
  { id: "p6", label: "Period 6", start: "11:40", end: "12:20", kind: "lesson" },
  { id: "b2", label: "Lunch", start: "12:20", end: "12:50", kind: "break" },
  { id: "p7", label: "Period 7", start: "12:50", end: "13:30", kind: "lesson" },
  { id: "p8", label: "Period 8", start: "13:30", end: "14:10", kind: "lesson" },
];

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export const periodsSchema = z
  .array(
    z.object({
      id: z.string().min(1),
      label: z.string().trim().min(1, "Name the period").max(30, "Use at most 30 characters"),
      start: z.string().regex(TIME, "Use a time like 08:00"),
      end: z.string().regex(TIME, "Use a time like 08:40"),
      kind: z.enum(["lesson", "break"]),
    }),
  )
  .min(1, "Add at least one period")
  .max(16, "Use at most 16 periods")
  .superRefine((periods, ctx) => {
    periods.forEach((p, i) => {
      if (TIME.test(p.start) && TIME.test(p.end) && p.end <= p.start) ctx.addIssue({ code: "custom", path: [i, "end"], message: "Ends after it starts" });
      const before = periods[i - 1];
      if (before && TIME.test(p.start) && TIME.test(before.end) && p.start < before.end) ctx.addIssue({ code: "custom", path: [i, "start"], message: `Starts after ${before.label} ends` });
    });
    if (!periods.some((p) => p.kind === "lesson")) ctx.addIssue({ code: "custom", path: [], message: "Keep at least one lesson period" });
  });

/** "8:00" from "08:00". */
export function shortTime(time: string): string {
  return time.replace(/^0(\d)/, "$1");
}

export type Lesson = { armId: string; day: Day; periodId: string; subjectId: string };

// ——— Splitting the timetable by class group ———

export const SECTIONS: readonly Section[] = ["preschool", "primary", "junior", "senior"];
/** How schools say them in a timetable's name: Primary, JSS, SSS. */
export const SECTION_SHORT: Record<Section, string> = { preschool: "Pre-school", primary: "Primary", junior: "JSS", senior: "SSS" };

/** One timetable: the class sections it covers, and its own bell schedule. */
export type GroupDraft = { id?: string; name: string; sections: Section[] };

export const groupsSchema = z
  .object({
    groups: z
      .array(
        z.object({
          id: z.string().min(1).max(40).optional(),
          name: z.string().trim().min(1, "Give each timetable a name").max(40, "Use at most 40 characters for a name"),
          sections: z.array(z.enum(["preschool", "primary", "junior", "senior"])).min(1, "Pick the classes each timetable covers"),
        }),
      )
      .min(1, "Keep at least one timetable")
      .max(4, "Use at most 4 timetables"),
  })
  .superRefine((r, ctx) => {
    const seen = new Set<string>();
    const names = new Set<string>();
    r.groups.forEach((g, i) => {
      for (const s of g.sections) {
        if (seen.has(s)) ctx.addIssue({ code: "custom", path: ["groups", i, "sections"], message: `${SECTION_SHORT[s]} is in two timetables. Each class belongs to one` });
        seen.add(s);
      }
      const key = g.name.trim().toLowerCase();
      if (names.has(key)) ctx.addIssue({ code: "custom", path: ["groups", i, "name"], message: "Two timetables have the same name" });
      names.add(key);
    });
  });

/** "Primary", "JSS and SSS", or "Whole school" when every section is in. */
export function groupName(sections: readonly Section[], available: readonly Section[] = SECTIONS): string {
  const picked = SECTIONS.filter((s) => sections.includes(s));
  if (picked.length > 1 && available.every((s) => picked.includes(s))) return "Whole school";
  return picked.map((s) => SECTION_SHORT[s]).join(" and ") || "Timetable";
}

/** The group a class section belongs to: its own, else the first (a class whose section is unknown). */
export function groupFor<G extends { sections: readonly Section[] }>(groups: G[], section: Section | null | undefined): G {
  return (section && groups.find((g) => g.sections.includes(section))) || groups[0]!;
}

const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

/** Two lessons for one teacher at the same time, in different classes. */
export type Clash = { teacherId: string; day: Day; periodId: string; armIds: string[] };

/**
 * Teachers in two classes at once. Without `timeOf`, the same period id is the same time (one bell
 * schedule). With it, lessons clash when their times overlap, which is what two groups with
 * different bell schedules need.
 */
export function clashes(lessons: Lesson[], teacherOf: (armId: string, subjectId: string) => string | null, timeOf?: (armId: string, periodId: string) => { start: string; end: string } | null): Clash[] {
  if (timeOf) {
    const byTeacherDay = new Map<string, { armId: string; periodId: string; start: number; end: number }[]>();
    for (const l of lessons) {
      const teacherId = teacherOf(l.armId, l.subjectId);
      const time = teacherId ? timeOf(l.armId, l.periodId) : null;
      if (!teacherId || !time) continue;
      const key = `${teacherId}|${l.day}`;
      (byTeacherDay.get(key) ?? byTeacherDay.set(key, []).get(key)!).push({ armId: l.armId, periodId: l.periodId, start: minutes(time.start), end: minutes(time.end) });
    }
    const found: Clash[] = [];
    for (const [key, list] of byTeacherDay) {
      const [teacherId, day] = key.split("|") as [string, string];
      list.sort((a, b) => a.start - b.start);
      let cluster: typeof list = [];
      let until = -1;
      const flush = () => {
        const arms = [...new Set(cluster.map((x) => x.armId))];
        if (arms.length > 1) found.push({ teacherId, day: Number(day) as Day, periodId: cluster[0]!.periodId, armIds: arms });
      };
      for (const item of list) {
        if (cluster.length && item.start >= until) {
          flush();
          cluster = [];
        }
        cluster.push(item);
        until = Math.max(cluster.length === 1 ? 0 : until, item.end);
      }
      if (cluster.length) flush();
    }
    return found;
  }
  const at = new Map<string, Clash>();
  for (const l of lessons) {
    const teacherId = teacherOf(l.armId, l.subjectId);
    if (!teacherId) continue;
    const key = `${teacherId}|${l.day}|${l.periodId}`;
    const found = at.get(key);
    if (found) {
      if (!found.armIds.includes(l.armId)) found.armIds.push(l.armId);
    } else at.set(key, { teacherId, day: l.day, periodId: l.periodId, armIds: [l.armId] });
  }
  return [...at.values()].filter((c) => c.armIds.length > 1);
}

// ——— Reading an uploaded timetable (Excel, CSV, Word) ———

const norm = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/** Short names schools write for common subjects. */
const ALIASES: Record<string, string[]> = {
  mathematics: ["maths", "math", "mth", "gmaths", "generalmathematics"],
  englishstudies: ["english", "eng", "englishlanguage"],
  basicscience: ["bsc", "basicsci"],
  basictechnology: ["btech", "basictech"],
  civiceducation: ["civic", "civics"],
  christianreligiousstudies: ["crs", "crk"],
  islamicstudies: ["irs", "irk"],
  physicalandhealtheducation: ["phe", "pe"],
  computerstudies: ["ict", "computer"],
  agriculturalscience: ["agric", "agricscience"],
  furthermathematics: ["fmaths", "furthermaths"],
};

/** The school subject a cell names (its name, code, a common short form, or a unique start), or null. */
export function matchSubject(text: string, subjects: { id: string; name: string; code: string }[]): string | null {
  const t = norm(text);
  if (!t) return null;
  const exact = subjects.find((s) => norm(s.name) === t || norm(s.code) === t);
  if (exact) return exact.id;
  const alias = subjects.find((s) => ALIASES[norm(s.name)]?.includes(t));
  if (alias) return alias.id;
  if (t.length >= 3) {
    const starts = subjects.filter((s) => norm(s.name).startsWith(t));
    if (starts.length === 1) return starts[0]!.id;
  }
  return null;
}

const FREE = new Set(["", "free", "freeperiod", "nil", "none", "x"]);

function dayOf(text: string): Day | null {
  const t = norm(text).slice(0, 3);
  const i = ["mon", "tue", "wed", "thu", "fri"].indexOf(t);
  return i < 0 ? null : ((i + 1) as Day);
}

function periodOf(text: string, periods: Period[]): Period | null {
  const t = norm(text);
  if (!t) return null;
  // "Period 3", or the template’s "Period 3 (9:20–10:00)": the name before any brackets, exactly.
  const head = norm(text.split("(")[0] ?? "");
  const byLabel = periods.find((p) => norm(p.label) === t || norm(p.label) === head);
  if (byLabel) return byLabel;
  // "8:00", "08:00 - 08:40", "8.00am": the start time.
  const time = text.match(/(\d{1,2})[:.](\d{2})/);
  if (time) {
    const start = `${time[1]!.padStart(2, "0")}:${time[2]}`;
    return periods.find((p) => p.start === start) ?? null;
  }
  return null;
}

export type GridProblem = { day: Day; periodId: string; text: string; message: string };
export type GridResult = { ok: true; lessons: Omit<Lesson, "armId">[]; problems: GridProblem[] } | { ok: false; message: string };

/**
 * One class's week from a table: days down the side and periods across the top (or the other way
 * round). Period headings match by name ("Period 3", "Break") or start time ("9:20"). Empty cells
 * and "Free" are free periods; break columns are skipped.
 */
export function readTimetableGrid(rows: string[][], periods: Period[], subjects: { id: string; name: string; code: string }[]): GridResult {
  const clean = rows.map((r) => r.map((c) => (c ?? "").trim()));
  // Days down the side: find the header row of periods.
  for (let h = 0; h < clean.length; h++) {
    const header = clean[h]!.map((c) => periodOf(c, periods));
    if (header.filter(Boolean).length < 2) continue;
    const cells: { day: Day; period: Period; text: string }[] = [];
    for (const row of clean.slice(h + 1)) {
      const day = row.map(dayOf).find((d) => d !== null) ?? null;
      if (!day) continue;
      header.forEach((period, c) => period && cells.push({ day, period, text: row[c] ?? "" }));
    }
    if (cells.length) return lessonsFrom(cells, subjects);
  }
  // Days across the top: find the header row of days.
  for (let h = 0; h < clean.length; h++) {
    const header = clean[h]!.map(dayOf);
    if (header.filter(Boolean).length < 3) continue;
    const cells: { day: Day; period: Period; text: string }[] = [];
    for (const row of clean.slice(h + 1)) {
      const period = row.map((c) => periodOf(c, periods)).find(Boolean) ?? null;
      if (!period) continue;
      header.forEach((day, c) => day && cells.push({ day, period, text: row[c] ?? "" }));
    }
    if (cells.length) return lessonsFrom(cells, subjects);
  }
  return { ok: false, message: "We couldn’t find the days and periods in this table. Use the template: days down the side, periods across the top." };
}

function lessonsFrom(cells: { day: Day; period: Period; text: string }[], subjects: { id: string; name: string; code: string }[]): GridResult {
  const lessons: Omit<Lesson, "armId">[] = [];
  const problems: GridProblem[] = [];
  for (const { day, period, text } of cells) {
    if (period.kind === "break" || FREE.has(norm(text)) || /^[-–—]+$/.test(text)) continue;
    const subjectId = matchSubject(text, subjects);
    if (subjectId) lessons.push({ day, periodId: period.id, subjectId });
    else problems.push({ day, periodId: period.id, text, message: `“${text}” isn’t one of the school’s subjects` });
  }
  return { ok: true, lessons, problems };
}

// ——— What the editor and the upload send ———

const day = z.coerce.number().refine((d): d is Day => (DAYS as readonly number[]).includes(d), "Monday to Friday only");

/** One lesson set from the editor; a null subject makes the period free. */
export const lessonInputSchema = z.object({ day, periodId: z.string().min(1), subjectId: z.string().min(1).nullable() });

/** Whole classes' weeks read from an uploaded file. */
export const timetableImportSchema = z.object({
  fileName: z.string().max(200),
  classes: z
    .array(z.object({ armId: z.string().min(1), lessons: z.array(z.object({ day, periodId: z.string().min(1), subjectId: z.string().min(1) })).max(100) }))
    .min(1, "Nothing to import")
    .max(200),
});
