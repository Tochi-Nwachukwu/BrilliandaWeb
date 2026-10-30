// FAKE: the timetable (batch 22) on sample data. The backend replaces this with a bell schedule per
// timetable, a lesson per class, day and period, and the uploaded documents in file storage. A
// lesson's teacher isn't stored: it is the class's teacher for that subject (Teachers, batch 11).
// A school can split its timetable by class section (Primary, JSS, SSS): each timetable has its own
// bell schedule and document, and every class belongs to the one that covers its section.
import "server-only";
import type { Section } from "@brillianda/core/classes";
import { clashes as findClashes, DEFAULT_PERIODS, groupFor, groupName, SECTION_SHORT, SECTIONS, type Day, type GroupDraft, type Lesson, type Period } from "@brillianda/core/timetable";
import type { ActionResult, TimetablePage } from "../types";
import { requireMember, requireStaff } from "./auth";
import { recordChange } from "./changes";
import { store } from "./store";
import { armOptions } from "./students";

const pause = () => new Promise((resolve) => setTimeout(resolve, 300));
const ADMINS_ONLY = "Only the school’s owner and admins can change the timetable.";
/** Kept in memory as a data URL here; the real one goes to file storage. */
export const TIMETABLE_FILE_MAX_BYTES = 2 * 1024 * 1024;

type Group = { id: string; name: string; sections: Section[]; periods: Period[] };
/** A school that never split its timetable has one, for the whole school. */
export const groupsOf = (subdomain: string): Group[] => store.timetableGroups.get(subdomain) ?? [{ id: "all", name: "Whole school", sections: [...SECTIONS], periods: [] }];
const fileKey = (subdomain: string, groupId: string) => `${subdomain}|${groupId}`;
const sectionOfArm = (subdomain: string, armId: string): Section | undefined => {
  const arm = armOptions(subdomain).find((a) => a.id === armId);
  return store.levels.find((l) => l.id === arm?.levelId)?.section;
};
export const groupOfArm = (subdomain: string, armId: string) => groupFor(groupsOf(subdomain), sectionOfArm(subdomain, armId));
/** The bell schedule a class follows: its timetable's. */
export const periodsOfArm = (subdomain: string, armId: string) => groupOfArm(subdomain, armId).periods;
const lessonsOf = (subdomain: string) => store.lessons.filter((l) => l.subdomain === subdomain);
const teacherOf = (armId: string, subjectId: string) => store.subjectTeachers.find((t) => t.armId === armId && t.subjectId === subjectId)?.userId ?? null;
const nameOf = (userId: string | null) => (userId ? (store.users.find((u) => u.id === userId)?.fullName ?? null) : null);

export async function getTimetable(subdomain: string): Promise<TimetablePage | null> {
  const staff = await requireStaff(subdomain);
  if (!staff) return null;
  const arms = armOptions(subdomain);
  const labels = new Map(arms.map((a) => [a.id, a.label]));
  const lessons = lessonsOf(subdomain).filter((l) => labels.has(l.armId));
  const timeOf = (armId: string, periodId: string) => periodsOfArm(subdomain, armId).find((p) => p.id === periodId) ?? null;
  return {
    groups: groupsOf(subdomain).map((g) => {
      const file = store.timetableFiles.get(fileKey(subdomain, g.id));
      return { ...g, file: file ? { name: file.name, size: file.size, url: file.url, by: file.by, at: file.at } : null };
    }),
    canSplit: true,
    arms: arms.map((a) => ({ id: a.id, label: a.label, levelId: a.levelId, section: sectionOfArm(subdomain, a.id) })),
    subjects: store.subjects
      .filter((s) => s.subdomain === subdomain)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((s) => ({ id: s.id, name: s.name, code: s.code, levelIds: store.subjectLinks.filter((l) => l.subjectId === s.id).map((l) => l.levelId) })),
    lessons: lessons.map((l) => {
      const teacherId = teacherOf(l.armId, l.subjectId);
      return { armId: l.armId, day: l.day, periodId: l.periodId, subjectId: l.subjectId, teacherId, teacherName: nameOf(teacherId) };
    }),
    clashes: findClashes(lessons, teacherOf, timeOf).map((c) => ({ teacherName: nameOf(c.teacherId) ?? "A teacher", day: c.day, periodId: c.periodId, armLabels: c.armIds.map((id) => labels.get(id) ?? "") })),
    me: { userId: staff.user.id, canEdit: staff.role === "owner" || staff.role === "admin" },
  };
}

/** One timetable's bell schedule (the first when none is named). Its classes' lessons in a removed period, or one turned into a break, are dropped. */
export async function saveBellSchedule(subdomain: string, periods: Period[], groupId?: string): Promise<ActionResult<{ removed: number }>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return { ok: false, error: ADMINS_ONLY };
  const groups = groupsOf(subdomain);
  const group = groups.find((g) => g.id === groupId) ?? groups[0]!;
  const lessonIds = new Set(periods.filter((p) => p.kind === "lesson").map((p) => p.id));
  const before = store.lessons.length;
  store.lessons = store.lessons.filter((l) => l.subdomain !== subdomain || groupOfArm(subdomain, l.armId).id !== group.id || lessonIds.has(l.periodId));
  store.timetableGroups.set(subdomain, groups.map((g) => (g.id === group.id ? { ...g, periods } : g)));
  recordChange(subdomain, who.fullName, groups.length > 1 ? `Changed the bell schedule for ${group.name}` : "Changed the bell schedule");
  return { ok: true, data: { removed: before - store.lessons.length } };
}

/**
 * Splits the timetable by class section, or joins it again. A new timetable starts as a copy of the
 * first one's bell schedule. Lessons whose period isn't in their class's new schedule are dropped.
 */
export async function saveTimetableGroups(subdomain: string, drafts: GroupDraft[]): Promise<ActionResult<{ removed: number }>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return { ok: false, error: ADMINS_ONLY };
  const current = groupsOf(subdomain);
  const present = [...new Set(store.levels.filter((l) => l.subdomain === subdomain && !l.archived).map((l) => l.section))];
  const covered = new Set(drafts.flatMap((d) => d.sections));
  const missing = present.filter((s) => !covered.has(s));
  if (missing.length) return { ok: false, error: `Add ${missing.map((s) => SECTION_SHORT[s]).join(" and ")} to a timetable: every class needs one.` };
  const start = current[0]?.periods.length ? current[0].periods : DEFAULT_PERIODS;
  const next: Group[] = drafts.map((d, i) => {
    const existing = d.id ? current.find((g) => g.id === d.id) : undefined;
    return { id: existing?.id ?? `g${Date.now().toString(36)}${i}`, name: d.name, sections: d.sections, periods: existing?.periods ?? start.map((p) => ({ ...p })) };
  });
  store.timetableGroups.set(subdomain, next);
  for (const g of current) if (!next.some((n) => n.id === g.id)) store.timetableFiles.delete(fileKey(subdomain, g.id));
  const before = store.lessons.length;
  store.lessons = store.lessons.filter((l) => {
    if (l.subdomain !== subdomain) return true;
    const periods = groupFor(next, sectionOfArm(subdomain, l.armId)).periods;
    return periods.some((p) => p.id === l.periodId && p.kind === "lesson");
  });
  recordChange(subdomain, who.fullName, next.length === 1 ? "Joined the timetable into one for the whole school" : `Split the timetable: ${next.map((g) => `${g.name} (${groupName(g.sections, present)})`).join(", ")}`);
  return { ok: true, data: { removed: before - store.lessons.length } };
}

function checkSlot(subdomain: string, armId: string, periodId: string): string | null {
  if (!armOptions(subdomain).some((a) => a.id === armId)) return "That class isn’t here any more.";
  const period = periodsOfArm(subdomain, armId).find((p) => p.id === periodId);
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

export async function setTimetableFile(subdomain: string, file: File, groupId?: string): Promise<ActionResult<null>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return { ok: false, error: ADMINS_ONLY };
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return { ok: false, error: "Upload a PDF." };
  if (file.size > TIMETABLE_FILE_MAX_BYTES) return { ok: false, error: "This PDF is over 2 MB. Save a smaller copy (or a photo of it as a PDF) and try again." };
  const url = `data:application/pdf;base64,${Buffer.from(await file.arrayBuffer()).toString("base64")}`;
  const group = groupsOf(subdomain).find((g) => g.id === groupId) ?? groupsOf(subdomain)[0]!;
  store.timetableFiles.set(fileKey(subdomain, group.id), { name: file.name, type: "application/pdf", size: file.size, url, by: who.fullName, at: Date.now() });
  recordChange(subdomain, who.fullName, `Uploaded the timetable document ${file.name}`);
  return { ok: true, data: null };
}

export async function removeTimetableFile(subdomain: string, groupId?: string): Promise<ActionResult<null>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return { ok: false, error: ADMINS_ONLY };
  store.timetableFiles.delete(fileKey(subdomain, (groupsOf(subdomain).find((g) => g.id === groupId) ?? groupsOf(subdomain)[0]!).id));
  recordChange(subdomain, who.fullName, "Removed the timetable document");
  return { ok: true, data: null };
}

/** A teacher's lessons today, for their Today page: in period order. */
export async function getMyLessonsToday(subdomain: string, day: Day | null): Promise<{ period: Period; armLabel: string; subjectName: string }[] | null> {
  const staff = await requireStaff(subdomain);
  if (!staff) return null;
  if (!day) return [];
  const labels = new Map(armOptions(subdomain).map((a) => [a.id, a.label]));
  return lessonsOf(subdomain)
    .filter((l) => l.day === day && teacherOf(l.armId, l.subjectId) === staff.user.id && labels.has(l.armId))
    .map((l) => ({ period: periodsOfArm(subdomain, l.armId).find((p) => p.id === l.periodId)!, armLabel: labels.get(l.armId)!, subjectName: store.subjects.find((s) => s.id === l.subjectId)?.name ?? "" }))
    .filter((x) => x.period)
    .sort((a, b) => a.period.start.localeCompare(b.period.start));
}

