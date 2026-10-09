// A school's team: the owner, admins and open invites (docs/data-contract.md).
import "server-only";
import * as impl from "./fake/auth";
import type { SchoolMember } from "./types";

/** Everyone on the team, owner first, then admins, then open invites. Empty if not a member. */
export function listMembers(subdomain: string): Promise<SchoolMember[]> {
  return impl.listMembers(subdomain);
}
