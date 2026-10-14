// FAKE: teachers, what they teach, and the daily register (batch 11), on sample data. The backend
// replaces this with staff assignment, register and register-mark tables.
import "server-only";
import { attendanceSummary, latestSchoolDay, registerDayProblem, schoolDaysSoFar, termOf, type RegisterInput } from "@brillianda/core/attendance";
import { defaultTerms } from "@brillianda/core/calendar";
import { fullName } from "@brillianda/core/students";
import { todayInLagos } from "@/lib/time";
import type { ActionResult, AttendanceSummary, Register, RegistersToday, SampleEmail, SubjectClass, TeacherHome, TeachersPage } from "../types";
import { requireMember, requireStaff } from "./auth";
import { recordChange } from "./changes";
import { store } from "./store";
import { armOptions } from "./students";

const pause = () => new Promise((resolve) => setTimeout(resolve, 300));
const fail = (error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> => ({ ok: false, error, fieldErrors });
const ADMINS_ONLY = "Only the school’s owner and admins can do this.";

function termsOf(subdomain: string) {
  const saved = store.calendars.get(subdomain);
  if (saved) return saved.terms;
  const today = new Date();
  return defaultTerms(today.getUTCMonth() >= 7 ? today.getUTCFullYear() : today.getUTCFullYear() - 1);
}
const armLabelOf = (subdomain: string, armId: string) => armOptions(subdomain).find((a) => a.id === armId)?.label ?? "a class";
const studentsIn = (armId: string) =>
  store.students
    .filter((s) => s.armId === armId && !s.deletedAt && s.status === "active")
    .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
const isTeacherAt = (subdomain: string, userId: string) => store.users.find((u) => u.id === userId && u.schools.some((s) => s.subdomain === subdomain && s.role === "teacher"));

/** Sample registers for Greenfield's JSS 1 Blue: this term's school days before today. */
function seedRegisters() {
  if (store.registersSeeded) return;
  store.registersSeeded = true;
  const today = todayInLagos();
  const term = termOf(today, termsOf("greenfield"));
  if (!term) return;
  const days = schoolDaysSoFar(term, today)
    .filter((d) => d < today)
    .slice(0, 8);
  const pupils = studentsIn("ga-gl1-gn1");
  days.forEach((date, i) => {
    store.registers.push({ armId: "ga-gl1-gn1", date, takenBy: "Bisi Adebayo", takenAt: Date.parse(`${date}T07:45:00Z`) });
    pupils.forEach((p, k) => store.marks.push({ armId: "ga-gl1-gn1", date, studentId: p.id, mark: (i + k) % 9 === 4 ? "absent" : (i + k) % 7 === 2 ? "late" : "present" }));
  });
}

/** Who may open an arm's register: owners and admins, and that arm's form teacher. */
async function registerAccess(subdomain: string, armId: string) {
  const staff = await requireStaff(subdomain);
  if (!staff || !store.arms.some((a) => a.subdomain === subdomain && a.id === armId)) return null;
  if (staff.role === "teacher" && !store.formTeachers.some((f) => f.armId === armId && f.userId === staff.user.id)) return null;
  return staff;
}

// ——— The Teachers page (owners and admins) ———

export async function getTeachersPage(subdomain: string): Promise<TeachersPage | null> {
  if (!(await requireMember(subdomain))) return null;
  const arms = armOptions(subdomain);
  const armIds = new Set(arms.map((a) => a.id));
  const label = (armId: string) => arms.find((a) => a.id === armId)?.label ?? "an old class";
  const subjects = store.subjects.filter((s) => s.subdomain === subdomain).sort((a, b) => a.position - b.position);
  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "a subject";
  const active = store.users
    .filter((u) => u.schools.some((s) => s.subdomain === subdomain && s.role === "teacher"))
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      status: "active" as const,
      formArms: store.formTeachers.filter((f) => f.userId === u.id && armIds.has(f.armId)).map((f) => ({ armId: f.armId, label: label(f.armId) })),
      subjectClasses: store.subjectTeachers
        .filter((t) => t.userId === u.id && armIds.has(t.armId))
        .map((t) => ({ armId: t.armId, subjectId: t.subjectId, label: `${subjectName(t.subjectId)}, ${label(t.armId)}` })),
    }));
  const invited = store.invites
    .filter((i) => i.subdomain === subdomain && i.role === "teacher" && !i.usedAt)
    .map((i) => ({ id: i.id, fullName: i.fullName, email: i.email, status: "invited" as const, invitedAt: i.createdAt, formArms: [], subjectClasses: [] }));
  return {
    teachers: [...active, ...invited],
    arms: arms.map((a) => ({ id: a.id, label: a.label, formTeacherId: store.formTeachers.find((f) => f.armId === a.id)?.userId ?? null })),
    subjects: subjects.map((s) => ({ id: s.id, name: s.name, code: s.code })),
  };
}

export async function inviteTeacher(subdomain: string, name: string, email: string): Promise<ActionResult<SampleEmail & { resent: boolean }>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return fail(ADMINS_ONLY);
  const existing = store.users.find((u) => u.email === email);
  if (existing?.schools.some((s) => s.subdomain === subdomain)) return fail("They’re already on the staff.", { email: ["Already on the staff"] });
  const pending = store.invites.find((i) => i.subdomain === subdomain && i.email === email && !i.usedAt);
  const token = crypto.randomUUID();
  if (pending) Object.assign(pending, { token, createdAt: Date.now(), fullName: name, role: "teacher" });
  else store.invites.push({ id: crypto.randomUUID(), token, subdomain, fullName: name, email, createdAt: Date.now(), role: "teacher" });
  recordChange(subdomain, who.fullName, `${pending ? "Sent a new invite to" : "Invited"} ${name} as a teacher`);
  return { ok: true, data: { resent: !!pending, sampleLinks: [{ label: "Open the invite link", href: `/s/${subdomain}/invite?token=${token}` }] } };
}

/** Takes a teacher off the staff (or cancels their invite). Registers they took keep their name. */
export async function removeTeacher(subdomain: string, id: string): Promise<ActionResult<null>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return fail(ADMINS_ONLY);
  const invite = store.invites.find((i) => i.subdomain === subdomain && i.id === id && i.role === "teacher" && !i.usedAt);
  if (invite) {
    store.invites = store.invites.filter((i) => i !== invite);
    recordChange(subdomain, who.fullName, `Cancelled ${invite.fullName}’s teacher invite`);
    return { ok: true, data: null };
  }
  const user = isTeacherAt(subdomain, id);
  if (!user) return fail("They aren’t a teacher here any more.");
  const armIds = new Set(store.arms.filter((a) => a.subdomain === subdomain).map((a) => a.id));
  user.schools = user.schools.filter((s) => s.subdomain !== subdomain);
  store.formTeachers = store.formTeachers.filter((f) => !(f.userId === id && armIds.has(f.armId)));
  store.subjectTeachers = store.subjectTeachers.filter((t) => !(t.userId === id && armIds.has(t.armId)));
  recordChange(subdomain, who.fullName, `Removed ${user.fullName} as a teacher`);
  return { ok: true, data: null };
}

/** One form teacher per arm: setting one replaces the last; null leaves the arm without. */
export async function setFormTeacher(subdomain: string, armId: string, userId: string | null): Promise<ActionResult<null>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return fail(ADMINS_ONLY);
  if (!store.arms.some((a) => a.subdomain === subdomain && a.id === armId)) return fail("That class isn’t here any more.");
  const teacher = userId ? isTeacherAt(subdomain, userId) : null;
  if (userId && !teacher) return fail("They aren’t a teacher here.");
  store.formTeachers = store.formTeachers.filter((f) => f.armId !== armId);
  if (teacher) store.formTeachers.push({ armId, userId: teacher.id });
  const label = armLabelOf(subdomain, armId);
  recordChange(subdomain, who.fullName, teacher ? `Made ${teacher.fullName} form teacher of ${label}` : `Left ${label} without a form teacher`);
  return { ok: true, data: null };
}

/** A teacher's subject classes, as a whole list. Each arm's subject has one teacher, so a class taken here leaves its last teacher. */
export async function setSubjectClasses(subdomain: string, userId: string, classes: { armId: string; subjectId: string }[]): Promise<ActionResult<null>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return fail(ADMINS_ONLY);
  const teacher = isTeacherAt(subdomain, userId);
  if (!teacher) return fail("They aren’t a teacher here.");
  const arms = new Set(store.arms.filter((a) => a.subdomain === subdomain).map((a) => a.id));
  const subjects = new Set(store.subjects.filter((s) => s.subdomain === subdomain).map((s) => s.id));
  if (classes.some((c) => !arms.has(c.armId) || !subjects.has(c.subjectId))) return fail("A class or subject isn’t here any more. Reload the page.");
  const key = (c: { armId: string; subjectId: string }) => `${c.armId}|${c.subjectId}`;
  const wanted = new Set(classes.map(key));
  store.subjectTeachers = store.subjectTeachers.filter((t) => !(arms.has(t.armId) && (t.userId === userId || wanted.has(key(t)))));
  for (const c of classes) store.subjectTeachers.push({ armId: c.armId, subjectId: c.subjectId, userId });
  recordChange(subdomain, who.fullName, `Set ${teacher.fullName}’s subjects (${classes.length} ${classes.length === 1 ? "class" : "classes"})`);
  return { ok: true, data: null };
}

// ——— The register ———

export async function getRegister(subdomain: string, armId: string, date?: string): Promise<Register | null> {
  if (!(await registerAccess(subdomain, armId))) return null;
  seedRegisters();
  const terms = termsOf(subdomain);
  const today = todayInLagos();
  const day = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : (latestSchoolDay(today, terms) ?? today);
  const term = termOf(today, terms);
  const takenDates = new Set(store.registers.filter((r) => r.armId === armId).map((r) => r.date));
  const register = store.registers.find((r) => r.armId === armId && r.date === day);
  const marks = store.marks.filter((m) => m.armId === armId && m.date === day);
  return {
    armId,
    armLabel: armLabelOf(subdomain, armId),
    date: day,
    problem: registerDayProblem(day, today, terms),
    taken: register ? { by: register.takenBy, at: register.takenAt, updatedBy: register.updatedBy, updatedAt: register.updatedAt } : null,
    students: studentsIn(armId).map((s) => {
      const m = marks.find((x) => x.studentId === s.id);
      return { id: s.id, fullName: fullName(s), admissionNo: s.admissionNo, mark: m?.mark ?? null, note: m?.note ?? "" };
    }),
    days: term ? schoolDaysSoFar(term, today).map((d) => ({ date: d, taken: takenDates.has(d) })) : [],
  };
}

export async function saveRegister(subdomain: string, armId: string, input: RegisterInput): Promise<ActionResult<{ present: number; absent: number }>> {
  await pause();
  const staff = await registerAccess(subdomain, armId);
  if (!staff) return fail("Only this class’s form teacher, or an admin, can mark its register.");
  const problem = registerDayProblem(input.date, todayInLagos(), termsOf(subdomain));
  if (problem) return fail(problem);
  const pupils = new Set(studentsIn(armId).map((s) => s.id));
  if (input.marks.some((m) => !pupils.has(m.studentId))) return fail("The class changed while you were marking. Reload and mark again.");
  if (new Set(input.marks.map((m) => m.studentId)).size !== pupils.size) return fail("Mark every student, then save.");
  const existing = store.registers.find((r) => r.armId === armId && r.date === input.date);
  if (existing) Object.assign(existing, { updatedBy: staff.user.fullName, updatedAt: Date.now() });
  else store.registers.push({ armId, date: input.date, takenBy: staff.user.fullName, takenAt: Date.now() });
  store.marks = store.marks.filter((m) => !(m.armId === armId && m.date === input.date));
  for (const m of input.marks) store.marks.push({ armId, date: input.date, studentId: m.studentId, mark: m.mark, ...(m.note ? { note: m.note } : {}) });
  const absent = input.marks.filter((m) => m.mark === "absent").length;
  recordChange(subdomain, staff.user.fullName, `${existing ? "Changed" : "Took"} the register for ${armLabelOf(subdomain, armId)} on ${input.date}`);
  return { ok: true, data: { present: input.marks.length - absent, absent } };
}

// ——— What teachers see ———

export async function getTeacherHome(subdomain: string): Promise<TeacherHome | null> {
  const staff = await requireStaff(subdomain);
  if (!staff) return null;
  seedRegisters();
  const terms = termsOf(subdomain);
  const today = todayInLagos();
  const term = termOf(today, terms);
  const daysThisTerm = term ? schoolDaysSoFar(term, today).length : 0;
  const arms = armOptions(subdomain);
  const armIds = new Set(arms.map((a) => a.id));
  const subjectName = (id: string) => store.subjects.find((s) => s.id === id)?.name ?? "A subject";
  return {
    fullName: staff.user.fullName,
    today: latestSchoolDay(today, terms) === today ? today : null,
    formArms: store.formTeachers
      .filter((f) => f.userId === staff.user.id && armIds.has(f.armId))
      .map((f) => ({
        armId: f.armId,
        label: armLabelOf(subdomain, f.armId),
        students: studentsIn(f.armId).length,
        takenToday: store.registers.some((r) => r.armId === f.armId && r.date === today),
        takenThisTerm: term ? store.registers.filter((r) => r.armId === f.armId && r.date >= term.startsOn && r.date <= today).length : 0,
        daysThisTerm,
      })),
    subjects: store.subjectTeachers
      .filter((t) => t.userId === staff.user.id && armIds.has(t.armId))
      .map((t) => ({ armId: t.armId, subjectId: t.subjectId, label: armLabelOf(subdomain, t.armId), subjectName: subjectName(t.subjectId), students: studentsIn(t.armId).length }))
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName) || arms.findIndex((x) => x.id === a.armId) - arms.findIndex((x) => x.id === b.armId)),
  };
}

export async function getSubjectClass(subdomain: string, armId: string, subjectId: string): Promise<SubjectClass | null> {
  const staff = await requireStaff(subdomain);
  if (!staff) return null;
  if (staff.role === "teacher" && !store.subjectTeachers.some((t) => t.armId === armId && t.subjectId === subjectId && t.userId === staff.user.id)) return null;
  const subject = store.subjects.find((s) => s.subdomain === subdomain && s.id === subjectId);
  if (!subject || !store.arms.some((a) => a.id === armId && a.subdomain === subdomain)) return null;
  return {
    armLabel: armLabelOf(subdomain, armId),
    subjectName: subject.name,
    students: studentsIn(armId).map((s) => ({ id: s.id, fullName: fullName(s), admissionNo: s.admissionNo })),
  };
}

// ——— What admins see ———

export async function getRegistersToday(subdomain: string): Promise<RegistersToday | null> {
  if (!(await requireMember(subdomain))) return null;
  seedRegisters();
  const today = todayInLagos();
  const arms = armOptions(subdomain).filter((a) => studentsIn(a.id).length > 0);
  const taken = new Set(store.registers.filter((r) => r.date === today).map((r) => r.armId));
  return {
    date: latestSchoolDay(today, termsOf(subdomain)) === today ? today : null,
    taken: arms.filter((a) => taken.has(a.id)).length,
    total: arms.length,
    missing: arms.filter((a) => !taken.has(a.id)).map((a) => ({ armId: a.id, label: a.label })),
  };
}

/** This term's attendance for one student, for their profile (late counts as present). */
export function attendanceOf(subdomain: string, studentId: string): AttendanceSummary {
  seedRegisters();
  const today = todayInLagos();
  const term = termOf(today, termsOf(subdomain));
  if (!term) return null;
  const marks = store.marks.filter((m) => m.studentId === studentId && m.date >= term.startsOn && m.date <= today).map((m) => m.mark);
  return { term: term.name, ...attendanceSummary(marks) };
}
