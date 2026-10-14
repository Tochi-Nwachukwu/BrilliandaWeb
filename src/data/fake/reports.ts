// FAKE: what a school does with scores (batch 15): the broadsheet, remarks, behaviour ratings,
// publishing a class, and report cards. Built on fake/results.ts and the shared maths in core.
import "server-only";
import { termOf } from "@brillianda/core/attendance";
import { resolveGrade } from "@brillianda/core/grading";
import { classResults, rowTotal, type RatingSettings } from "@brillianda/core/results";
import { fullName } from "@brillianda/core/students";
import { todayInLagos } from "@/lib/time";
import type { ActionResult, Broadsheet, ClassReports, ReportCardData, SubjectCell } from "../types";
import { requireMember, requireStaff } from "./auth";
import { recordChange } from "./changes";
import { resultsTermOf, rowsOf, seedResults, settingsOf, statusOf, subjectsForArm } from "./results";
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
function computeClass(subdomain: string, term: string, armId: string) {
  const settings = settingsOf(subdomain);
  const subjects = subjectsForArm(subdomain, armId);
  const pupils = studentsIn(armId);
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

/** One student's card this term. `forParent` (batch 16) only once the class is published. */
export function buildReportCard(subdomain: string, studentId: string): ReportCardData | null {
  const student = store.students.find((s) => s.subdomain === subdomain && s.id === studentId && !s.deletedAt);
  const term = resultsTermOf(subdomain);
  const school = store.schools.find((s) => s.subdomain === subdomain);
  if (!student || !term || !school) return null;
  seedResults();
  const { settings, subjects, pupils, results } = computeClass(subdomain, term.key, student.armId);
  const mine = results.get(studentId);
  const calendar = store.calendars.get(subdomain);
  const today = todayInLagos();
  const current = calendar ? termOf(today, calendar.terms) : null;
  const next = calendar?.terms.find((t) => t.startsOn > (current?.endsOn ?? today));
  const remark = (kind: "teacher" | "principal") => store.remarks.find((r) => r.term === term.key && r.studentId === studentId && r.kind === kind)?.text ?? null;
  const formTeacherId = store.formTeachers.find((f) => f.armId === student.armId)?.userId;
  const ratings = ratingSettingsOf(subdomain);
  return {
    school: { name: school.name, logoUrl: school.logoUrl, brandColor: school.brandColor },
    term,
    student: { id: student.id, fullName: fullName(student), admissionNo: student.admissionNo, armLabel: armLabelOf(subdomain, student.armId) },
    components: settings.components,
    subjects: subjects
      .map(({ subject }) => {
        const row = rowsOf(term.key, student.armId, subject.id).find((r) => r.studentId === studentId);
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
    attendance: attendanceOf(subdomain, studentId),
    ratings: ratings.enabled ? ratings.traits.map((trait) => ({ trait, value: store.ratings.find((r) => r.term === term.key && r.studentId === studentId && r.trait === trait)?.value ?? null })) : [],
    teacherRemark: remark("teacher"),
    principalRemark: remark("principal"),
    formTeacher: store.users.find((u) => u.id === formTeacherId)?.fullName ?? null,
    nextTermBegins: next?.startsOn ?? null,
    scale: settings.scale,
    published: isPublished(subdomain, student.armId),
  };
}

export async function getReportCard(subdomain: string, studentId: string): Promise<ReportCardData | null> {
  const student = store.students.find((s) => s.subdomain === subdomain && s.id === studentId);
  if (!student || !(await classAccess(subdomain, student.armId))) return null;
  return buildReportCard(subdomain, studentId);
}
