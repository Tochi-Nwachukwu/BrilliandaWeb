// FAKE: student accounts and the student portal (batch 23) on sample data. A student's account
// belongs to their student record; they see only themselves. The backend replaces this with a
// student-account link and invitations with role "student".
import "server-only";
import { schoolDaysSoFar, termOf } from "@brillianda/core/attendance";
import { fullName } from "@brillianda/core/students";
import { todayInLagos } from "@/lib/time";
import type { ActionResult, ClassTimetable, ReportCardData, SampleEmail, StudentAccess, StudentAccountsPage, StudentHome } from "../types";
import { requireMember, requireStudent } from "./auth";
import { birthdayFor } from "./birthdays";
import { bookListsFor } from "./booklists";
import { recordChange } from "./changes";
import { resultsFor, termsOf } from "./parents";
import { buildReportCard, reportTermsOf } from "./reports";
import { store } from "./store";
import { armOptions } from "./students";
import { attendanceOf } from "./teaching";
import { periodsOf } from "./timetable";

const pause = () => new Promise((resolve) => setTimeout(resolve, 300));
const ADMINS_ONLY = "Only the school’s owner and admins can do this.";

function accessOf(subdomain: string, studentId: string): { access: StudentAccess; email: string | null } {
  const link = store.studentLinks.find((l) => l.studentId === studentId);
  const user = link && store.users.find((u) => u.id === link.userId && u.schools.some((s) => s.subdomain === subdomain && s.role === "student"));
  if (user) return { access: "active", email: user.email };
  const invite = store.invites.find((i) => i.subdomain === subdomain && i.role === "student" && i.studentId === studentId && !i.usedAt);
  return invite ? { access: "invited", email: invite.email } : { access: "none", email: null };
}

// ——— More › Student accounts (owners and admins) ———

export async function getStudentAccounts(subdomain: string): Promise<StudentAccountsPage | null> {
  if (!(await requireMember(subdomain))) return null;
  const arms = armOptions(subdomain);
  const labels = new Map(arms.map((a) => [a.id, a.label]));
  const order = new Map(arms.map((a, i) => [a.id, i]));
  return {
    arms: arms.map((a) => ({ id: a.id, label: a.label })),
    students: store.students
      .filter((s) => s.subdomain === subdomain && !s.deletedAt && s.status === "active")
      .sort((a, b) => (order.get(a.armId) ?? 0) - (order.get(b.armId) ?? 0) || fullName(a).localeCompare(fullName(b)))
      .map((s) => ({ id: s.id, fullName: fullName(s), admissionNo: s.admissionNo, armId: s.armId, armLabel: labels.get(s.armId) ?? "No class", ...accessOf(subdomain, s.id) })),
  };
}

export async function inviteStudent(subdomain: string, studentId: string, email: string): Promise<ActionResult<SampleEmail>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return { ok: false, error: ADMINS_ONLY };
  const s = store.students.find((x) => x.subdomain === subdomain && x.id === studentId && !x.deletedAt);
  if (!s) return { ok: false, error: "That student isn’t here any more." };
  if (accessOf(subdomain, studentId).access === "active") return { ok: false, error: `${s.firstName} already uses the student portal.` };
  const taken = store.users.find((u) => u.email === email && u.schools.some((x) => x.subdomain === subdomain));
  if (taken) return { ok: false, error: "Someone at this school already uses that email.", fieldErrors: { email: ["Someone at this school already uses this email"] } };
  const token = crypto.randomUUID();
  const pending = store.invites.find((i) => i.subdomain === subdomain && i.role === "student" && i.studentId === studentId && !i.usedAt);
  if (pending) Object.assign(pending, { token, email, createdAt: Date.now(), fullName: fullName(s) });
  else store.invites.push({ id: crypto.randomUUID(), token, subdomain, fullName: fullName(s), email, createdAt: Date.now(), role: "student", studentId });
  recordChange(subdomain, who.fullName, `Invited ${fullName(s)} to the student portal`, s.id);
  return { ok: true, data: { sampleLinks: [{ label: `Open ${s.firstName}’s invite`, href: `/s/${subdomain}/invite?token=${token}` }] } };
}

export async function removeStudentAccess(subdomain: string, studentId: string): Promise<ActionResult<null>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return { ok: false, error: ADMINS_ONLY };
  const s = store.students.find((x) => x.subdomain === subdomain && x.id === studentId);
  if (!s) return { ok: false, error: "That student isn’t here any more." };
  store.invites = store.invites.filter((i) => !(i.subdomain === subdomain && i.role === "student" && i.studentId === studentId && !i.usedAt));
  const links = store.studentLinks.filter((l) => l.studentId === studentId);
  store.studentLinks = store.studentLinks.filter((l) => l.studentId !== studentId);
  for (const user of store.users.filter((u) => links.some((l) => l.userId === u.id))) {
    user.schools = user.schools.filter((x) => !(x.subdomain === subdomain && x.role === "student"));
  }
  recordChange(subdomain, who.fullName, `Ended ${fullName(s)}’s student portal access`, s.id);
  return { ok: true, data: null };
}

// ——— What a student sees ———

export async function getStudentHome(subdomain: string): Promise<StudentHome | null> {
  const me = await requireStudent(subdomain);
  if (!me) return null;
  const s = me.student;
  const today = todayInLagos();
  const term = termOf(today, termsOf(subdomain));
  const days = term ? schoolDaysSoFar(term, today).slice(0, 10) : [];
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const periods = periodsOf(subdomain);
  const formTeacherId = store.formTeachers.find((f) => f.armId === s.armId)?.userId;
  return {
    fullName: fullName(s),
    armLabel: armOptions(subdomain).find((a) => a.id === s.armId)?.label ?? "No class",
    admissionNo: s.admissionNo,
    formTeacher: store.users.find((u) => u.id === formTeacherId)?.fullName ?? null,
    birthday: birthdayFor(subdomain, s.id),
    lessonsToday:
      weekday >= 1 && weekday <= 5
        ? periods
            .filter((p) => p.kind === "lesson")
            .flatMap((p) => {
              const l = store.lessons.find((x) => x.subdomain === subdomain && x.armId === s.armId && x.day === weekday && x.periodId === p.id);
              const subject = l && store.subjects.find((x) => x.id === l.subjectId);
              return subject ? [{ periodLabel: p.label, start: p.start, end: p.end, subjectName: subject.name }] : [];
            })
        : [],
    attendance: attendanceOf(subdomain, s.id),
    recent: days.map((date) => ({ date, mark: store.marks.find((m) => m.studentId === s.id && m.date === date)?.mark ?? null })),
    results: resultsFor(subdomain, s.id),
    pastTerms: reportTermsOf(subdomain, s.id)
      .filter((t) => t.published && !t.open)
      .map((t) => ({ key: t.key, label: `${t.name}, ${t.session}` })),
    bookLists: bookListsFor(subdomain, s.armId),
  };
}

export async function getStudentTimetable(subdomain: string): Promise<ClassTimetable | null> {
  const me = await requireStudent(subdomain);
  if (!me) return null;
  const armId = me.student.armId;
  const teacher = (subjectId: string) => {
    const id = store.subjectTeachers.find((t) => t.armId === armId && t.subjectId === subjectId)?.userId;
    return store.users.find((u) => u.id === id)?.fullName ?? null;
  };
  return {
    armLabel: armOptions(subdomain).find((a) => a.id === armId)?.label ?? "",
    periods: periodsOf(subdomain),
    lessons: store.lessons
      .filter((l) => l.subdomain === subdomain && l.armId === armId)
      .map((l) => ({ day: l.day, periodId: l.periodId, subjectName: store.subjects.find((x) => x.id === l.subjectId)?.name ?? "", teacherName: teacher(l.subjectId) })),
  };
}

/** A student's own report card, only once their class's results are published. */
export async function getStudentReportCard(subdomain: string, termKey?: string): Promise<ReportCardData | null> {
  const me = await requireStudent(subdomain);
  if (!me) return null;
  const card = buildReportCard(subdomain, me.student.id, termKey);
  return card?.published ? card : null;
}
