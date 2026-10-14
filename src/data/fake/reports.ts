// FAKE: what a school does with scores (batch 15): the broadsheet, remarks, behaviour ratings,
// publishing a class, and report cards. Built on fake/results.ts and the shared maths in core.
import "server-only";
import { attendanceSummary } from "@brillianda/core/attendance";
import { resolveGrade } from "@brillianda/core/grading";
import { classResults, rowTotal, type RatingSettings } from "@brillianda/core/results";
import { fullName } from "@brillianda/core/students";
import type { ActionResult, AttendanceSummary, Broadsheet, ClassReports, ReportCardData, ResultsTerm, SubjectCell } from "../types";
import { requireMember, requireStaff } from "./auth";
import { recordChange } from "./changes";
import { pupilsFor, resultsTermOf, rowsOf, seedResults, settingsOf, statusOf, subjectsForArm } from "./results";
import { store } from "./store";
import { armOptions } from "./students";
import { attendanceOf } from "./teaching";

const pause = () => new Promise((resolve) => setTimeout(resolve, 200));
const fail = (error: string): ActionResult<never> => ({ ok: false, error });

export const ratingSettingsOf = (subdomain: string) => store.ratingSettings.get(subdomain) ?? { enabled: false, traits: [] };
const armLabelOf = (subdomain: string, armId: string) => armOptions(subdomain).find((a) => a.id === armId)?.label ?? "a class";
const studentsIn = (armId: string) =>
  store.students
    .filter((s) => s.armId === armId && !s.deletedAt && s.status === "active")
    .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));

/** Admins see every class; a form teacher sees (and remarks on) their own. */
async function classAccess(subdomain: string, armId: string) {
  const staff = await requireStaff(subdomain);
  if (!staff || !store.arms.some((a) => a.subdomain === subdomain && a.id === armId)) return null;
  const isAdmin = staff.role === "owner" || staff.role === "admin";
  if (!isAdmin && !store.formTeachers.some((f) => f.armId === armId && f.userId === staff.user.id)) return null;
  return { ...staff, isAdmin };
}

/** Each student's subject totals (complete rows only) and the class's averages and positions. */
export function computeClass(subdomain: string, term: string, armId: string) {
  const settings = settingsOf(subdomain);
  const subjects = subjectsForArm(subdomain, armId);
  const pupils = pupilsFor(term, armId);
  const cells = new Map<string, Record<string, SubjectCell>>(pupils.map((p) => [p.id, {}]));
  const totals: { studentId: string; subjectId: string; total: number }[] = [];
  for (const { subject } of subjects) {
    for (const row of rowsOf(term, armId, subject.id)) {
      const mine = cells.get(row.studentId);
      if (!mine) continue;
      if (row.excluded) {
        mine[subject.id] = "excluded";
        continue;
      }
      const total = rowTotal(row, settings.components);
      mine[subject.id] = total === null ? null : { total, grade: resolveGrade(total, settings.scale).grade };
      if (total !== null) totals.push({ studentId: row.studentId, subjectId: subject.id, total });
    }
  }
  return { settings, subjects, pupils, cells, results: classResults(pupils.map((p) => p.id), totals) };
}

export async function getBroadsheet(subdomain: string, armId: string): Promise<Broadsheet | null> {
  const access = await classAccess(subdomain, armId);
  const term = resultsTermOf(subdomain);
  if (!access || !term) return null;
  seedResults();
  const { settings, subjects, pupils, cells, results } = computeClass(subdomain, term.key, armId);
  const statuses = subjects.map(({ subject }) => ({ id: subject.id, name: subject.name, code: subject.code, status: statusOf(subdomain, term.key, armId, subject.id).status }));
  const published = store.publishedArms.find((p) => p.term === term.key && p.armId === armId);
  return {
    term,
    armId,
    armLabel: armLabelOf(subdomain, armId),
    showPositions: settings.showPositions,
    subjects: statuses,
    rows: pupils.map((p) => ({
      studentId: p.id,
      fullName: fullName(p),
      admissionNo: p.admissionNo,
      cells: cells.get(p.id) ?? {},
      average: results.get(p.id)?.average ?? null,
      position: settings.showPositions ? (results.get(p.id)?.position ?? null) : null,
    })),
    allComplete: statuses.length > 0 && statuses.every((s) => s.status === "complete"),
    published: published ? { by: published.by, at: published.at } : null,
    canPublish: access.isAdmin,
  };
}

// ——— Remarks and ratings ———

export async function getClassReports(subdomain: string, armId: string): Promise<ClassReports | null> {
  const access = await classAccess(subdomain, armId);
  const term = resultsTermOf(subdomain);
  if (!access || !term) return null;
  const remark = (studentId: string, kind: "teacher" | "principal") => store.remarks.find((r) => r.term === term.key && r.studentId === studentId && r.kind === kind)?.text ?? "";
  return {
    term,
    armId,
    armLabel: armLabelOf(subdomain, armId),
    ratings: ratingSettingsOf(subdomain),
    canWritePrincipal: access.isAdmin,
    rows: studentsIn(armId).map((p) => ({
      studentId: p.id,
      fullName: fullName(p),
      teacherRemark: remark(p.id, "teacher"),
      principalRemark: remark(p.id, "principal"),
      ratings: Object.fromEntries(store.ratings.filter((r) => r.term === term.key && r.studentId === p.id).map((r) => [r.trait, r.value])),
    })),
  };
}

export async function saveRemark(subdomain: string, armId: string, studentId: string, kind: "teacher" | "principal", text: string): Promise<ActionResult<null>> {
  const access = await classAccess(subdomain, armId);
  const term = resultsTermOf(subdomain);
  if (!access || !term) return fail("You can’t write remarks for this class.");
  if (kind === "principal" && !access.isAdmin) return fail("Only the school’s owner and admins write the principal’s remark.");
  if (!studentsIn(armId).some((s) => s.id === studentId)) return fail("That student isn’t in this class any more.");
  store.remarks = store.remarks.filter((r) => !(r.term === term.key && r.studentId === studentId && r.kind === kind));
  if (text) store.remarks.push({ term: term.key, studentId, kind, text, by: access.user.fullName, at: Date.now() });
  return { ok: true, data: null };
}

export async function saveRating(subdomain: string, armId: string, studentId: string, trait: string, value: number | null): Promise<ActionResult<null>> {
  const access = await classAccess(subdomain, armId);
  const term = resultsTermOf(subdomain);
  if (!access || !term) return fail("You can’t rate students in this class.");
  if (!ratingSettingsOf(subdomain).traits.includes(trait)) return fail("That trait isn’t rated here any more. Reload the page.");
  if (!studentsIn(armId).some((s) => s.id === studentId)) return fail("That student isn’t in this class any more.");
  store.ratings = store.ratings.filter((r) => !(r.term === term.key && r.studentId === studentId && r.trait === trait));
  if (value !== null) store.ratings.push({ term: term.key, studentId, trait, value });
  return { ok: true, data: null };
}

export async function getRatingSettings(subdomain: string): Promise<RatingSettings | null> {
  if (!(await requireMember(subdomain))) return null;
  return ratingSettingsOf(subdomain);
}

export async function saveRatingSettings(subdomain: string, input: RatingSettings): Promise<ActionResult<null>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return fail("Only the school’s owner and admins can change this.");
  store.ratingSettings.set(subdomain, input);
  recordChange(subdomain, who.fullName, input.enabled ? `Set behaviour ratings: ${input.traits.join(", ")}` : "Turned behaviour ratings off");
  return { ok: true, data: null };
}

// ——— Publishing ———

/** Parents see a class's results once it's published. Every subject must be complete first. */
export async function setPublished(subdomain: string, armId: string, publish: boolean): Promise<ActionResult<null>> {
  await pause();
  const who = await requireMember(subdomain);
  const term = resultsTermOf(subdomain);
  if (!who || !term) return fail("Only the school’s owner and admins can publish results.");
  const label = armLabelOf(subdomain, armId);
  const already = store.publishedArms.some((p) => p.term === term.key && p.armId === armId);
  if (publish) {
    if (already) return fail(`${label} is already published.`);
    const open = subjectsForArm(subdomain, armId).filter(({ subject }) => statusOf(subdomain, term.key, armId, subject.id).status !== "complete");
    if (open.length) return fail(`${open.length} ${open.length === 1 ? "subject isn’t" : "subjects aren’t"} complete yet: ${open.map((o) => o.subject.name).join(", ")}.`);
    store.publishedArms.push({ term: term.key, armId, by: who.fullName, at: Date.now() });
    recordChange(subdomain, who.fullName, `Published ${term.name} results for ${label}`);
  } else {
    if (!already) return fail(`${label} isn’t published.`);
    store.publishedArms = store.publishedArms.filter((p) => !(p.term === term.key && p.armId === armId));
    recordChange(subdomain, who.fullName, `Took back ${term.name} results for ${label}`);
  }
  return { ok: true, data: null };
}

export const isPublished = (subdomain: string, armId: string) => {
  const term = resultsTermOf(subdomain);
  return !!term && store.publishedArms.some((p) => p.term === term.key && p.armId === armId);
};

// ——— Report cards ———

/** A term by its key: the open one, or a closed one (whose name is kept even after the session ends). */
export function termByKey(subdomain: string, key: string): ResultsTerm | null {
  const open = resultsTermOf(subdomain);
  if (open?.key === key) return open;
  const closed = store.closedTerms.find((c) => c.subdomain === subdomain && c.key === key);
  if (!closed) return null;
  const index = Number(key.split("-")[1]) - 1;
  const calendar = store.calendars.get(subdomain);
  return { key, name: closed.name, session: closed.session, index, isLast: calendar ? index === calendar.terms.length - 1 : false };
}

/** The term's dates and the next term's, when it's in the calendar the school has now. */
function datesOf(subdomain: string, key: string) {
  const calendar = store.calendars.get(subdomain);
  const [year, number] = key.split("-").map(Number);
  if (!calendar || calendar.startYear !== year) return null;
  return { term: calendar.terms[number! - 1] ?? null, next: calendar.terms[number!] ?? null };
}

/** The class a student was in for a term: where their scores are, else where they are now. */
function armIn(studentId: string, key: string, fallback: string) {
  return [...store.scores, ...store.exclusions].find((x) => x.term === key && x.studentId === studentId)?.armId ?? fallback;
}

/** One student's card for a term (default: the open one). Parents see it only once its class is published. */
export function buildReportCard(subdomain: string, studentId: string, termKey?: string): ReportCardData | null {
  const student = store.students.find((s) => s.subdomain === subdomain && s.id === studentId && !s.deletedAt);
  const term = termKey ? termByKey(subdomain, termKey) : resultsTermOf(subdomain);
  const school = store.schools.find((s) => s.subdomain === subdomain);
  if (!student || !term || !school) return null;
  seedResults();
  const armId = armIn(studentId, term.key, student.armId);
  const { settings, subjects, pupils, results } = computeClass(subdomain, term.key, armId);
  const mine = results.get(studentId);
  const dates = datesOf(subdomain, term.key);
  const remark = (kind: "teacher" | "principal") => store.remarks.find((r) => r.term === term.key && r.studentId === studentId && r.kind === kind)?.text ?? null;
  const formTeacherId = store.formTeachers.find((f) => f.armId === armId)?.userId;
  const ratings = ratingSettingsOf(subdomain);
  // Attendance within the term's own dates; the open term uses this term's register.
  let attendance: AttendanceSummary = attendanceOf(subdomain, studentId);
  if (term.key !== resultsTermOf(subdomain)?.key) {
    const t = dates?.term;
    const marks = t ? store.marks.filter((m) => m.studentId === studentId && m.date >= t.startsOn && m.date <= t.endsOn).map((m) => m.mark) : [];
    attendance = t ? { term: term.name, ...attendanceSummary(marks) } : null;
  }
  return {
    school: { name: school.name, logoUrl: school.logoUrl, brandColor: school.brandColor },
    term,
    student: { id: student.id, fullName: fullName(student), admissionNo: student.admissionNo, armLabel: armLabelOf(subdomain, armId) },
    components: settings.components,
    subjects: subjects
      .map(({ subject }) => {
        const row = rowsOf(term.key, armId, subject.id).find((r) => r.studentId === studentId);
        if (!row || row.excluded) return null;
        const total = rowTotal(row, settings.components);
        const band = total === null ? null : resolveGrade(total, settings.scale);
        return {
          name: subject.name,
          scores: Object.fromEntries(settings.components.map((c) => [c.id, row.scores[c.id] ?? null])),
          total,
          grade: band?.grade ?? null,
          remark: band?.remark ?? null,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null),
    average: mine?.average ?? null,
    position: settings.showPositions ? (mine?.position ?? null) : null,
    of: pupils.length,
    showPositions: settings.showPositions,
    attendance,
    ratings: ratings.enabled ? ratings.traits.map((trait) => ({ trait, value: store.ratings.find((r) => r.term === term.key && r.studentId === studentId && r.trait === trait)?.value ?? null })) : [],
    teacherRemark: remark("teacher"),
    principalRemark: remark("principal"),
    formTeacher: store.users.find((u) => u.id === formTeacherId)?.fullName ?? null,
    nextTermBegins: dates?.next?.startsOn ?? null,
    scale: settings.scale,
    published: store.publishedArms.some((p) => p.term === term.key && p.armId === armId),
  };
}

/** Every term a student has results in, newest first, and whether each was published. */
export function reportTermsOf(subdomain: string, studentId: string): { key: string; name: string; session: string; published: boolean; open: boolean }[] {
  seedResults();
  const keys = [...new Set([...store.scores, ...store.exclusions].filter((x) => x.studentId === studentId).map((x) => x.term))];
  const open = resultsTermOf(subdomain)?.key;
  return keys
    .map((key) => {
      const term = termByKey(subdomain, key);
      if (!term) return null;
      const armId = armIn(studentId, key, "");
      return { key, name: term.name, session: term.session, published: store.publishedArms.some((p) => p.term === key && p.armId === armId), open: key === open };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.key.localeCompare(a.key));
}

export async function getReportCard(subdomain: string, studentId: string, termKey?: string): Promise<ReportCardData | null> {
  const student = store.students.find((s) => s.subdomain === subdomain && s.id === studentId);
  if (!student || !(await classAccess(subdomain, student.armId))) return null;
  return buildReportCard(subdomain, studentId, termKey);
}

/** A student's result terms, for admins (every term, published or not). */
export async function getReportTerms(subdomain: string, studentId: string) {
  if (!(await requireMember(subdomain))) return null;
  return reportTermsOf(subdomain, studentId);
}
