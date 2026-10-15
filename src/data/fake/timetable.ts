// FAKE: the timetable (batch 22) on sample data. The backend replaces this with a bell schedule per
// school, a lesson per class, day and period, and the uploaded document in file storage. A lesson's
// teacher isn't stored: it is the class's teacher for that subject (Teachers, batch 11).
import "server-only";
import { clashes as findClashes, type Day, type Lesson, type Period } from "@brillianda/core/timetable";
import type { ActionResult, TimetablePage } from "../types";
import { requireMember, requireStaff } from "./auth";
import { recordChange } from "./changes";
import { store } from "./store";
import { armOptions } from "./students";

const pause = () => new Promise((resolve) => setTimeout(resolve, 300));
const ADMINS_ONLY = "Only the school’s owner and admins can change the timetable.";
/** Kept in memory as a data URL here; the real one goes to file storage. */
export const TIMETABLE_FILE_MAX_BYTES = 2 * 1024 * 1024;

export const periodsOf = (subdomain: string) => store.bellSchedules.get(subdomain) ?? [];
const lessonsOf = (subdomain: string) => store.lessons.filter((l) => l.subdomain === subdomain);
const teacherOf = (armId: string, subjectId: string) => store.subjectTeachers.find((t) => t.armId === armId && t.subjectId === subjectId)?.userId ?? null;
const nameOf = (userId: string | null) => (userId ? (store.users.find((u) => u.id === userId)?.fullName ?? null) : null);

export async function getTimetable(subdomain: string): Promise<TimetablePage | null> {
  const staff = await requireStaff(subdomain);
  if (!staff) return null;
  const arms = armOptions(subdomain);
  const labels = new Map(arms.map((a) => [a.id, a.label]));
  const lessons = lessonsOf(subdomain).filter((l) => labels.has(l.armId));
  const file = store.timetableFiles.get(subdomain);
  return {
    periods: periodsOf(subdomain),
    arms: arms.map((a) => ({ id: a.id, label: a.label, levelId: a.levelId })),
    subjects: store.subjects
      .filter((s) => s.subdomain === subdomain)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((s) => ({ id: s.id, name: s.name, code: s.code, levelIds: store.subjectLinks.filter((l) => l.subjectId === s.id).map((l) => l.levelId) })),
    lessons: lessons.map((l) => {
      const teacherId = teacherOf(l.armId, l.subjectId);
      return { armId: l.armId, day: l.day, periodId: l.periodId, subjectId: l.subjectId, teacherId, teacherName: nameOf(teacherId) };
    }),
    clashes: findClashes(lessons, teacherOf).map((c) => ({ teacherName: nameOf(c.teacherId) ?? "A teacher", day: c.day, periodId: c.periodId, armLabels: c.armIds.map((id) => labels.get(id) ?? "") })),
    file: file ? { name: file.name, size: file.size, url: file.url, by: file.by, at: file.at } : null,
    me: { userId: staff.user.id, canEdit: staff.role === "owner" || staff.role === "admin" },
  };
}

/** The bell schedule. Lessons in a removed period, or one turned into a break, are dropped. */
export async function saveBellSchedule(subdomain: string, periods: Period[]): Promise<ActionResult<{ removed: number }>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return { ok: false, error: ADMINS_ONLY };
  const lessonIds = new Set(periods.filter((p) => p.kind === "lesson").map((p) => p.id));
  const before = store.lessons.length;
  store.lessons = store.lessons.filter((l) => l.subdomain !== subdomain || lessonIds.has(l.periodId));
  store.bellSchedules.set(subdomain, periods);
  recordChange(subdomain, who.fullName, "Changed the bell schedule");
  return { ok: true, data: { removed: before - store.lessons.length } };
}

function checkSlot(subdomain: string, armId: string, periodId: string): string | null {
  if (!armOptions(subdomain).some((a) => a.id === armId)) return "That class isn’t here any more.";
  const period = periodsOf(subdomain).find((p) => p.id === periodId);
  if (!period) return "That period isn’t in the bell schedule any more.";
  return period.kind === "break" ? "No lessons in a break." : null;
}

/** One class's lesson in one period; null makes it free. */
export async function setLesson(subdomain: string, armId: string, day: Day, periodId: string, subjectId: string | null): Promise<ActionResult<null>> {
  const who = await requireMember(subdomain);
  if (!who) return { ok: false, error: ADMINS_ONLY };
  const problem = checkSlot(subdomain, armId, periodId);
  if (problem) return { ok: false, error: problem };
  if (subjectId && !store.subjects.some((s) => s.subdomain === subdomain && s.id === subjectId)) return { ok: false, error: "That subject isn’t here any more." };
  store.lessons = store.lessons.filter((l) => !(l.subdomain === subdomain && l.armId === armId && l.day === day && l.periodId === periodId));
  if (subjectId) store.lessons.push({ subdomain, armId, day, periodId, subjectId });
  return { ok: true, data: null };
}

/** Replaces whole classes' weeks, from an uploaded file. */
export async function importTimetable(subdomain: string, classes: { armId: string; lessons: Omit<Lesson, "armId">[] }[], fileName: string): Promise<ActionResult<{ classes: number; lessons: number }>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return { ok: false, error: ADMINS_ONLY };
  for (const c of classes) {
    for (const l of c.lessons) {
      const problem = checkSlot(subdomain, c.armId, l.periodId);
      if (problem) return { ok: false, error: problem };
      if (!store.subjects.some((s) => s.subdomain === subdomain && s.id === l.subjectId)) return { ok: false, error: "A subject in the file isn’t here any more." };
    }
  }
  const arms = new Set(classes.map((c) => c.armId));
  store.lessons = store.lessons.filter((l) => !(l.subdomain === subdomain && arms.has(l.armId)));
  for (const c of classes) for (const l of c.lessons) store.lessons.push({ subdomain, armId: c.armId, ...l });
  const count = classes.reduce((n, c) => n + c.lessons.length, 0);
  recordChange(subdomain, who.fullName, `Uploaded the timetable for ${classes.length === 1 ? "1 class" : `${classes.length} classes`} from ${fileName}`);
  return { ok: true, data: { classes: classes.length, lessons: count } };
}

export async function setTimetableFile(subdomain: string, file: File): Promise<ActionResult<null>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return { ok: false, error: ADMINS_ONLY };
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return { ok: false, error: "Upload a PDF." };
  if (file.size > TIMETABLE_FILE_MAX_BYTES) return { ok: false, error: "This PDF is over 2 MB. Save a smaller copy (or a photo of it as a PDF) and try again." };
  const url = `data:application/pdf;base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
  store.timetableFiles.set(subdomain, { name: file.name, type: "application/pdf", size: file.size, url, by: who.fullName, at: Date.now() });
  recordChange(subdomain, who.fullName, `Uploaded the timetable document ${file.name}`);
  return { ok: true, data: null };
}

export async function removeTimetableFile(subdomain: string): Promise<ActionResult<null>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return { ok: false, error: ADMINS_ONLY };
  store.timetableFiles.delete(subdomain);
  recordChange(subdomain, who.fullName, "Removed the timetable document");
  return { ok: true, data: null };
}

/** A teacher's lessons today, for their Today page: in period order. */
export async function getMyLessonsToday(subdomain: string, day: Day | null): Promise<{ period: Period; armLabel: string; subjectName: string }[] | null> {
  const staff = await requireStaff(subdomain);
  if (!staff) return null;
  if (!day) return [];
  const labels = new Map(armOptions(subdomain).map((a) => [a.id, a.label]));
  const periods = periodsOf(subdomain);
  return lessonsOf(subdomain)
    .filter((l) => l.day === day && teacherOf(l.armId, l.subjectId) === staff.user.id && labels.has(l.armId))
    .map((l) => ({ period: periods.find((p) => p.id === l.periodId)!, armLabel: labels.get(l.armId)!, subjectName: store.subjects.find((s) => s.id === l.subjectId)?.name ?? "" }))
    .filter((x) => x.period)
    .sort((a, b) => a.period.start.localeCompare(b.period.start));
}

