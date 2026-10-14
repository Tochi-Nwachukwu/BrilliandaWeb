// Parents (batch 12; docs/data-contract.md). Screens import from here, never from fake/.
import "server-only";
import * as impl from "./fake/parents";
import type { ParentHome, ParentsPage, ReportCardData } from "./types";

/** More › Parents: every guardian with children here, and whether they use the parent app. Owners and admins. */
export function getParentsPage(subdomain: string): Promise<ParentsPage | null> {
  return impl.getParentsPage(subdomain);
}

/** A signed-in parent's children: class, form teacher and attendance. Only their own. */
export function getParentHome(subdomain: string): Promise<ParentHome | null> {
  return impl.getParentHome(subdomain);
}

/** A child's report card for their parent: only their own children, and only once the class is published. */
export function getParentReportCard(subdomain: string, studentId: string, termKey?: string): Promise<ReportCardData | null> {
  return impl.getParentReportCard(subdomain, studentId, termKey);
}
