// FAKE: students and guardians on sample data. The backend replaces this with the students,
// guardians and enrolments tables, the per-school admission counter and the audit log.
import "server-only";
import {
  admissionPatternProblems,
  armChip,
  armLabel,
  defaultAdmissionPattern,
  formatAdmissionNo,
  fullName,
  normaliseNigerianPhone,
  sameAdmissionNo,
  STATUS_LABEL,
  type StudentInput,
  type StudentStatus,
} from "@brillianda/core";
import type { ActionResult, AdmissionSettings, ArmOption, GuardianMatch, StudentDetail, StudentRow, StudentsList } from "../types";
import { requireMember } from "./auth";
import { recordChange } from "./changes";
import { store, type FakeStudent } from "./store";

const pause = () => new Promise((resolve) => setTimeout(resolve, 300));
const fail = (error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> => ({ ok: false, error, fieldErrors });

export function armOptions(subdomain: string): ArmOption[] {
  const levels = store.levels.filter((l) => l.subdomain === subdomain && !l.archived);
  const names = new Map(store.armNames.filter((a) => a.subdomain === subdomain).map((a) => [a.id, a]));
  return levels
    .sort((a, b) => a.position - b.position)
    .flatMap((level) => {
      const arms = store.arms
        .filter((a) => a.levelId === level.id && !a.archived)
        .sort((a, b) => (names.get(a.armNameId)?.position ?? 0) - (names.get(b.armNameId)?.position ?? 0));
      return arms.map((arm) => {
        const name = names.get(arm.armNameId);
        return { id: arm.id, label: armLabel(level.name, name?.name ?? "", arms.length), chip: armChip(level.short, name?.code ?? "", arms.length), levelId: level.id, levelName: level.name, levelPosition: level.position };
      });
    });
}

const live = (subdomain: string) => store.students.filter((s) => s.subdomain === subdomain && !s.deletedAt);
const guardianOf = (s: FakeStudent) => (s.guardianId ? store.guardians.find((g) => g.id === s.guardianId) : undefined);

function toRow(s: FakeStudent): StudentRow {
  const g = guardianOf(s);
  return { id: s.id, fullName: fullName(s), admissionNo: s.admissionNo, gender: s.gender, status: s.status, armId: s.armId, dateOfBirth: s.dateOfBirth, guardianName: g?.name ?? null, guardianPhone: g?.phone ?? null };
}

function admissionOf(subdomain: string) {
  let settings = store.admission.get(subdomain);
  if (!settings) {
    const name = store.schools.find((s) => s.subdomain === subdomain)?.name ?? "School";
    settings = { pattern: defaultAdmissionPattern(name), digits: 4, next: 1 };
    store.admission.set(subdomain, settings);
  }
  return settings;
}
const sessionYear = (subdomain: string) => store.calendars.get(subdomain)?.startYear ?? new Date().getFullYear();

export async function listStudents(subdomain: string): Promise<StudentsList | null> {
  if (!(await requireMember(subdomain))) return null;
  const settings = admissionOf(subdomain);
  return {
    students: live(subdomain).sort((a, b) => fullName(a).localeCompare(fullName(b))).map(toRow),
    arms: armOptions(subdomain),
    nextAdmissionNo: formatAdmissionNo(settings, sessionYear(subdomain), settings.next),
  };
}

export async function getStudent(subdomain: string, id: string): Promise<StudentDetail | null> {
  if (!(await requireMember(subdomain))) return null;
  const s = live(subdomain).find((x) => x.id === id);
  if (!s) return null;
  const arms = new Map(armOptions(subdomain).map((a) => [a.id, a.label]));
  // Archived classes still show their name on a student's history.
  const anyArmLabel = (armId: string) => {
    if (arms.has(armId)) return arms.get(armId)!;
    const arm = store.arms.find((a) => a.id === armId);
    const level = arm && store.levels.find((l) => l.id === arm.levelId);
    return level ? `${level.name} ${store.armNames.find((n) => n.id === arm.armNameId)?.name ?? ""}`.trim() : "A class that was removed";
  };
  const g = guardianOf(s);
  return {
    ...toRow(s),
    firstName: s.firstName,
    lastName: s.lastName,
    otherNames: s.otherNames,
    admissionDate: s.admissionDate,
    address: s.address,
    stateOfOrigin: s.stateOfOrigin,
    guardian: g
      ? {
          id: g.id,
          name: g.name,
          phone: g.phone,
          email: g.email,
          siblings: live(subdomain)
            .filter((x) => x.guardianId === g.id && x.id !== s.id)
            .map((x) => ({ id: x.id, fullName: fullName(x), armLabel: anyArmLabel(x.armId) })),
        }
      : null,
    classHistory: store.enrolments.filter((e) => e.studentId === s.id).map((e) => ({ armLabel: anyArmLabel(e.armId), from: e.from })),
    changes: store.changes
      .filter((c) => c.studentId === s.id)
      .sort((a, b) => b.at - a.at)
      .map(({ id: changeId, at, who, what }) => ({ id: changeId, at, who, what })),
  };
}

/** Siblings share a guardian: a phone number already on file offers to link that guardian (plan). */
export async function findGuardian(subdomain: string, phone: string): Promise<GuardianMatch | null> {
  if (!(await requireMember(subdomain))) return null;
  const normalised = normaliseNigerianPhone(phone);
  if (!normalised) return null;
  const g = store.guardians.find((x) => x.subdomain === subdomain && x.phone === normalised);
  if (!g) return null;
  return { id: g.id, name: g.name, phone: normalised, children: live(subdomain).filter((s) => s.guardianId === g.id).map((s) => s.firstName) };
}

function guardianFor(subdomain: string, input: StudentInput): string | null {
  if (input.guardianId && store.guardians.some((g) => g.id === input.guardianId && g.subdomain === subdomain)) return input.guardianId;
  if (!input.guardianName) return null;
  const id = crypto.randomUUID();
  store.guardians.push({ id, subdomain, name: input.guardianName, phone: normaliseNigerianPhone(input.guardianPhone), email: input.guardianEmail || null });
  return id;
}

const today = () => new Date().toISOString().slice(0, 10);

export async function addStudent(subdomain: string, input: StudentInput): Promise<ActionResult<{ id: string; admissionNo: string; fullName: string }>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return fail("Sign in first.");
  if (!armOptions(subdomain).some((a) => a.id === input.armId)) return fail("That class isn’t open any more.", { armId: ["Choose a class"] });
  const settings = admissionOf(subdomain);
  let admissionNo = input.admissionNo;
  if (admissionNo) {
    if (live(subdomain).some((s) => sameAdmissionNo(s.admissionNo, admissionNo))) return fail("Another student has this admission number.", { admissionNo: ["Already used by another student"] });
  } else {
    // The school's counter, so two admins adding at once never get the same number.
    do admissionNo = formatAdmissionNo(settings, sessionYear(subdomain), settings.next++);
    while (live(subdomain).some((s) => sameAdmissionNo(s.admissionNo, admissionNo)));
  }
  const id = crypto.randomUUID();
  const now = Date.now();
  store.students.push({
    id,
    subdomain,
    armId: input.armId,
    status: "active",
    firstName: input.firstName,
    lastName: input.lastName,
    otherNames: input.otherNames,
    gender: input.gender,
    dateOfBirth: input.dateOfBirth,
    admissionNo,
    admissionDate: input.admissionDate || today(),
    address: input.address,
    stateOfOrigin: input.stateOfOrigin,
    guardianId: guardianFor(subdomain, input),
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    importBatchId: null,
  });
  store.enrolments.push({ studentId: id, armId: input.armId, from: input.admissionDate || today() });
  const name = fullName(input);
  recordChange(subdomain, who.fullName, `Added ${name}`, id);
  return { ok: true, data: { id, admissionNo, fullName: name } };
}

export async function updateStudent(subdomain: string, id: string, input: StudentInput): Promise<ActionResult<null>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return fail("Sign in first.");
  const s = live(subdomain).find((x) => x.id === id);
  if (!s) return fail("That student isn’t here any more.");
  const admissionNo = input.admissionNo || s.admissionNo;
  if (live(subdomain).some((x) => x.id !== id && sameAdmissionNo(x.admissionNo, admissionNo))) return fail("Another student has this admission number.", { admissionNo: ["Already used by another student"] });
  const moved = s.armId !== input.armId;
  if (moved && !armOptions(subdomain).some((a) => a.id === input.armId)) return fail("That class isn’t open any more.", { armId: ["Choose a class"] });
  Object.assign(s, {
    firstName: input.firstName,
    lastName: input.lastName,
    otherNames: input.otherNames,
    gender: input.gender,
    dateOfBirth: input.dateOfBirth,
    admissionNo,
    admissionDate: input.admissionDate || s.admissionDate,
    address: input.address,
    stateOfOrigin: input.stateOfOrigin,
    armId: input.armId,
    updatedAt: Date.now(),
  });
  if (input.guardianId || input.guardianName) {
    const existing = guardianOf(s);
    if (input.guardianId && input.guardianId !== s.guardianId) s.guardianId = guardianFor(subdomain, input);
    else if (existing && !input.guardianId) Object.assign(existing, { name: input.guardianName, phone: normaliseNigerianPhone(input.guardianPhone), email: input.guardianEmail || null });
    else if (!existing) s.guardianId = guardianFor(subdomain, input);
  }
  if (moved) {
    store.enrolments.push({ studentId: id, armId: input.armId, from: today() });
    recordChange(subdomain, who.fullName, `Moved ${fullName(s)} to ${armOptions(subdomain).find((a) => a.id === input.armId)?.label}`, id);
  }
  recordChange(subdomain, who.fullName, `Updated ${fullName(s)}’s details`, id);
  return { ok: true, data: null };
}

export async function moveStudents(subdomain: string, ids: string[], armId: string): Promise<ActionResult<{ moved: number }>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return fail("Sign in first.");
  const arm = armOptions(subdomain).find((a) => a.id === armId);
  if (!arm) return fail("That class isn’t open any more.");
  let moved = 0;
  for (const s of live(subdomain).filter((x) => ids.includes(x.id) && x.armId !== armId)) {
    s.armId = armId;
    s.updatedAt = Date.now();
    store.enrolments.push({ studentId: s.id, armId, from: today() });
    recordChange(subdomain, who.fullName, `Moved ${fullName(s)} to ${arm.label}`, s.id);
    moved++;
  }
  if (moved > 1) recordChange(subdomain, who.fullName, `Moved ${moved} students to ${arm.label}`);
  return { ok: true, data: { moved } };
}

export async function setStudentsStatus(subdomain: string, ids: string[], status: StudentStatus): Promise<ActionResult<{ changed: number }>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return fail("Sign in first.");
  let changed = 0;
  for (const s of live(subdomain).filter((x) => ids.includes(x.id) && x.status !== status)) {
    s.status = status;
    s.updatedAt = Date.now();
    recordChange(subdomain, who.fullName, `Marked ${fullName(s)} as ${STATUS_LABEL[status].toLowerCase()}`, s.id);
    changed++;
  }
  return { ok: true, data: { changed } };
}

/** Delete is for mistakes only, and soft: the record stays in the database. */
export async function deleteStudent(subdomain: string, id: string): Promise<ActionResult<null>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return fail("Sign in first.");
  const s = live(subdomain).find((x) => x.id === id);
  if (!s) return fail("That student isn’t here any more.");
  s.deletedAt = Date.now();
  recordChange(subdomain, who.fullName, `Deleted ${fullName(s)}, added by mistake`);
  return { ok: true, data: null };
}

export async function getAdmissionSettings(subdomain: string): Promise<AdmissionSettings | null> {
  if (!(await requireMember(subdomain))) return null;
  const s = admissionOf(subdomain);
  return { pattern: s.pattern, digits: s.digits, next: s.next, preview: formatAdmissionNo(s, sessionYear(subdomain), s.next) };
}

export async function setAdmissionFormat(subdomain: string, pattern: string, digits: number): Promise<ActionResult<AdmissionSettings>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return fail("Sign in first.");
  const problems = admissionPatternProblems({ pattern, digits });
  if (problems.length) return fail(problems[0]!, { pattern: problems });
  const s = admissionOf(subdomain);
  Object.assign(s, { pattern: pattern.trim(), digits });
  recordChange(subdomain, who.fullName, `Set admission numbers to ${s.pattern}`);
  return { ok: true, data: { pattern: s.pattern, digits, next: s.next, preview: formatAdmissionNo(s, sessionYear(subdomain), s.next) } };
}
