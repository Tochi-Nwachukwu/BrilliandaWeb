// Students, guardians and admission numbers on the Brillianda API. Same functions and shapes as
// ../fake/students.ts. The API writes genders in lower case; ours are upper case.
import "server-only";
import { ms } from "@brillianda/core/apiBridge";
import type { StudentGender, StudentInput, StudentStatus } from "@brillianda/core/students";
import type { ActionResult, AdmissionSettings, GuardianMatch, StudentDetail, StudentRow, StudentsList } from "../types";
import { api, fail, read } from "./client";

const id = encodeURIComponent;
const gender = (g: string) => g.toUpperCase() as StudentGender;

type Row = Omit<StudentRow, "gender"> & { gender: string };
type Detail = Row &
  Pick<StudentDetail, "firstName" | "lastName" | "otherNames" | "admissionDate" | "address" | "stateOfOrigin" | "classHistory"> & {
    guardian: Omit<NonNullable<StudentDetail["guardian"]>, "parentAccess"> | null;
    changes: { id: string; at: string; who: string; what: string }[];
  };

export async function listStudents(subdomain: string): Promise<StudentsList | null> {
  const list = await read<Omit<StudentsList, "students"> & { students: Row[] }>(subdomain, "/v1/students");
  return list ? { ...list, students: list.students.map((s) => ({ ...s, gender: gender(s.gender) })) } : null;
}

export async function getStudent(subdomain: string, studentId: string): Promise<StudentDetail | null> {
  const s = await read<Detail>(subdomain, `/v1/students/${id(studentId)}`);
  if (!s) return null;
  return {
    ...s,
    gender: gender(s.gender),
    // The parent app and registers aren't on the API yet (after v1).
    guardian: s.guardian ? { ...s.guardian, parentAccess: "none" } : null,
    attendance: null,
    changes: s.changes.map((c) => ({ ...c, at: ms(c.at) })),
  };
}

export async function findGuardian(subdomain: string, phone: string): Promise<GuardianMatch | null> {
  const found = await read<{ guardian: GuardianMatch | null }>(subdomain, "/v1/guardians", { phone });
  return found?.guardian ?? null;
}

const body = (input: StudentInput) => ({ ...input, gender: input.gender.toLowerCase() });

export async function addStudent(subdomain: string, input: StudentInput): Promise<ActionResult<{ id: string; admissionNo: string; fullName: string }>> {
  const result = await api<{ id: string; admissionNo: string; fullName: string }>(subdomain, "/v1/students", { method: "POST", body: body(input) });
  return result.ok ? { ok: true, data: result.data } : fail(result);
}

export async function updateStudent(subdomain: string, studentId: string, input: StudentInput): Promise<ActionResult<null>> {
  const result = await api(subdomain, `/v1/students/${id(studentId)}`, { method: "PUT", body: body(input) });
  return result.ok ? { ok: true, data: null } : fail(result);
}

export async function moveStudents(subdomain: string, ids: string[], armId: string): Promise<ActionResult<{ moved: number }>> {
  const result = await api<{ moved: number }>(subdomain, "/v1/students/move", { method: "POST", body: { studentIds: ids, armId } });
  return result.ok ? { ok: true, data: result.data } : fail(result);
}

export async function setStudentsStatus(subdomain: string, ids: string[], status: StudentStatus): Promise<ActionResult<{ changed: number }>> {
  const result = await api<{ changed: number }>(subdomain, "/v1/students/status", { method: "POST", body: { studentIds: ids, status } });
  return result.ok ? { ok: true, data: result.data } : fail(result);
}

export async function deleteStudent(subdomain: string, studentId: string): Promise<ActionResult<null>> {
  const result = await api(subdomain, `/v1/students/${id(studentId)}`, { method: "DELETE" });
  return result.ok ? { ok: true, data: null } : fail(result);
}

export async function getAdmissionSettings(subdomain: string): Promise<AdmissionSettings | null> {
  return read<AdmissionSettings>(subdomain, "/v1/admission-numbers");
}

export async function setAdmissionFormat(subdomain: string, pattern: string, digits: number): Promise<ActionResult<AdmissionSettings>> {
  const result = await api<AdmissionSettings>(subdomain, "/v1/admission-numbers", { method: "PUT", body: { pattern, digits } });
  return result.ok ? { ok: true, data: result.data } : fail(result);
}
