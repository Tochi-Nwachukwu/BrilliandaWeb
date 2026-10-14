// Parents (batch 12; docs/data-contract.md). Screens import from here, never from fake/.
import "server-only";
import * as impl from "./fake/parents";
import type { ParentHome, ParentsPage } from "./types";

/** More › Parents: every guardian with children here, and whether they use the parent app. Owners and admins. */
export function getParentsPage(subdomain: string): Promise<ParentsPage | null> {
  return impl.getParentsPage(subdomain);
}

/** A signed-in parent's children: class, form teacher and attendance. Only their own. */
export function getParentHome(subdomain: string): Promise<ParentHome | null> {
  return impl.getParentHome(subdomain);
}
