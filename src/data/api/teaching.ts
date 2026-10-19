// Teachers, what they teach, and the daily register, on the Brillianda API. Same functions and
// shapes as ../fake/teaching.ts.
import "server-only";
import type { RegisterInput } from "@brillianda/core/attendance";
import type { ActionResult, Register, RegistersToday, SampleEmail, SubjectClass, TeacherHome, TeachersPage } from "../types";
import { api, fail, read } from "./client";
import { outboxSample } from "./outbox";

const id = encodeURIComponent;

export async function getTeachersPage(subdomain: string): Promise<TeachersPage | null> {
  return read<TeachersPage>(subdomain, "/v1/teachers");
}

export async function inviteTeacher(subdomain: string, fullName: string, email: string): Promise<ActionResult<SampleEmail & { resent: boolean }>> {
  const since = Date.now();
  const result = await api(subdomain, "/v1/invitations", { method: "POST", body: { email, fullName, role: "teacher" } });
  if (result.ok) return { ok: true, data: { resent: false, ...(await outboxSample(email, since)) } };
  if (result.problem.code === "conflict") return { ok: false, error: result.problem.detail ?? "They’re already on the team.", fieldErrors: { email: [result.problem.detail ?? "Already on the team"] } };
  return fail(result);
}

/** Removes a teacher, or cancels a teacher's invite. */
export async function removeTeacher(subdomain: string, teacherId: string): Promise<ActionResult<null>> {
  const result = await api(subdomain, `/v1/teachers/${id(teacherId)}`, { method: "DELETE" });
  return result.ok ? { ok: true, data: null } : fail(result);
}

export async function setFormTeacher(subdomain: string, armId: string, userId: string | null): Promise<ActionResult<null>> {
  const result = await api(subdomain, `/v1/arms/${id(armId)}/form-teacher`, { method: "PUT", body: { userId } });
  return result.ok ? { ok: true, data: null } : fail(result);
}

export async function setSubjectClasses(subdomain: string, userId: string, classes: { armId: string; subjectId: string }[]): Promise<ActionResult<null>> {
  const result = await api(subdomain, `/v1/teachers/${id(userId)}/subject-classes`, { method: "PUT", body: classes });
  return result.ok ? { ok: true, data: null } : fail(result);
}

export async function getRegister(subdomain: string, armId: string, date?: string): Promise<Register | null> {
  return read<Register>(subdomain, `/v1/arms/${id(armId)}/register`, date ? { date } : undefined);
}

export async function saveRegister(subdomain: string, armId: string, input: RegisterInput): Promise<ActionResult<{ present: number; absent: number }>> {
  const result = await api<{ present: number; absent: number }>(subdomain, `/v1/arms/${id(armId)}/register`, { method: "PUT", body: input });
  return result.ok ? { ok: true, data: result.data } : fail(result);
}

export async function getTeacherHome(subdomain: string): Promise<TeacherHome | null> {
  return read<TeacherHome>(subdomain, "/v1/me/teaching");
}

export async function getSubjectClass(subdomain: string, armId: string, subjectId: string): Promise<SubjectClass | null> {
  return read<SubjectClass>(subdomain, `/v1/arms/${id(armId)}/subjects/${id(subjectId)}/students`);
}

export async function getRegistersToday(subdomain: string): Promise<RegistersToday | null> {
  return read<RegistersToday>(subdomain, "/v1/registers/today");
}
