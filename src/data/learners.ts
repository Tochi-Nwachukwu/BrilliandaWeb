// Student accounts and the student portal (batch 23; docs/data-contract.md). Screens import from here, never from fake/.
import "server-only";
import * as impl from "./fake/learners";
import type { ClassTimetable, ReportCardData, StudentAccountsPage, StudentHome } from "./types";

/** More › Student accounts: every active student and whether they use the portal. Owners and admins. */
export function getStudentAccounts(subdomain: string): Promise<StudentAccountsPage | null> {
  return impl.getStudentAccounts(subdomain);
}

/** The signed-in student's home: today's lessons, attendance, results, book lists. Only their own. */
export function getStudentHome(subdomain: string): Promise<StudentHome | null> {
  return impl.getStudentHome(subdomain);
}

/** The signed-in student's class week. */
export function getStudentTimetable(subdomain: string): Promise<ClassTimetable | null> {
  return impl.getStudentTimetable(subdomain);
}

/** The signed-in student's report card, once published. */
export function getStudentReportCard(subdomain: string, termKey?: string): Promise<ReportCardData | null> {
  return impl.getStudentReportCard(subdomain, termKey);
}
