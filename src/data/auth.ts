// Who is signed in (docs/data-contract.md). Screens import from here, never from fake/.
import "server-only";
import * as impl from "./fake/auth";
import type { InviteDetails, SchoolSummary, SignedInMember } from "./types";

/**
 * The person signed in at this school and their role, or null. Someone signed in at another
 * school counts as signed out here. Reads the session cookie, so call it inside <Suspense>.
 */
export function getCurrentMember(subdomain: string): Promise<SignedInMember | null> {
  return impl.getCurrentMember(subdomain);
}

/** The active schools the signed-in person belongs to, for the school picker on /login. */
export function getMySchools(): Promise<SchoolSummary[]> {
  return impl.getMySchools();
}

/** An invite by its link's token, or null if there is no such invite at this school. */
export function getInvite(subdomain: string, token: string): Promise<InviteDetails | null> {
  return impl.getInvite(subdomain, token);
}
