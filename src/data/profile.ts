// My profile, in every dashboard (docs/data-contract.md). Screens import from here, never from fake/.
import "server-only";
import * as live from "./api/profile";
import * as fake from "./fake/profile";
import { LIVE } from "./source";
import type { MyProfile } from "./types";

// The API where it has endpoints (DATA_SOURCE=api), else sample data.
const impl = LIVE ? live : fake;

/** The signed-in person's name, email, phone and photo at this school, whatever their role. */
export function getMyProfile(subdomain: string): Promise<MyProfile | null> {
  return impl.getMyProfile(subdomain);
}
