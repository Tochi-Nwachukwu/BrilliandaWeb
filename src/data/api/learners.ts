// Student accounts and the student portal, on the Brillianda API. Same functions and shapes as
// ../fake/learners.ts.
import "server-only";
import type { ActionResult, ClassTimetable, ReportCardData, SampleEmail, StudentAccountsPage, StudentHome } from "../types";
import { api, fail, read } from "./client";
import { outboxSample } from "./outbox";

const id = encodeURIComponent;

export async function getStudentAccounts(subdomain: string): Promise<StudentAccountsPage | null> {
  return read<StudentAccountsPage>(subdomain, "/v1/student-accounts");
}

/** Sends the invite email; inviting again replaces the open one. */
export async function inviteStudent(subdomain: string, studentId: string, email: string): Promise<ActionResult<SampleEmail>> {
  const since = Date.now();
  const result = await api(subdomain, `/v1/students/${id(studentId)}/invite`, { method: "POST", body: { email } });
  return result.ok ? { ok: true, data: await outboxSample(email, since) } : fail(result);
}

export async function removeStudentAccess(subdomain: string, studentId: string): Promise<ActionResult<null>> {
  const result = await api(subdomain, `/v1/students/${id(studentId)}/access`, { method: "DELETE" });
  return result.ok ? { ok: true, data: null } : fail(result);
}

export async function getStudentHome(subdomain: string): Promise<StudentHome | null> {
  return read<StudentHome>(subdomain, "/v1/me/student");
}

export async function getStudentTimetable(subdomain: string): Promise<ClassTimetable | null> {
  return read<ClassTimetable>(subdomain, "/v1/me/timetable");
}

export async function getStudentReportCard(subdomain: string, termKey?: string): Promise<ReportCardData | null> {
  return read<ReportCardData>(subdomain, "/v1/me/report-card", { term: termKey });
}
