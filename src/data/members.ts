// A school's team: the owner, admins and open invites (docs/data-contract.md).
import "server-only";
import { LIVE } from "./api/client";
import * as live from "./api/auth";
import * as fake from "./fake/auth";
import type { SchoolMember } from "./types";

// The API where it has endpoints (DATA_SOURCE=api), else sample data.
const impl = LIVE ? live : fake;

/** Everyone on the team, owner first, then admins, then open invites. Empty if not a member. */
export function listMembers(subdomain: string): Promise<SchoolMember[]> {
  return impl.listMembers(subdomain);
}
