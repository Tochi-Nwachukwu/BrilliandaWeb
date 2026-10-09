// The school's record of changes (plan: "Audit log of changes"; docs/data-contract.md). Screens
// import from here, never from fake/.
import "server-only";
import * as impl from "./fake/changes";
import type { ChangeFilter, ChangeLog } from "./types";

/**
 * Who changed what, newest first, narrowed by person, words, Lagos dates or one student. Owners
 * and admins. The real one is append-only and kept for at least two years (plan: safeguards).
 */
export function listChanges(subdomain: string, filter: ChangeFilter = {}): Promise<ChangeLog | null> {
  return impl.listChanges(subdomain, filter);
}
