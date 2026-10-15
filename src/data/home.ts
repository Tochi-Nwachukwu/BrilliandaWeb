// Home and the school's calendar (docs/data-contract.md). Screens import from here, never from fake/.
import "server-only";
import { LIVE } from "./api/client";
import * as live from "./api/home";
import * as fake from "./fake/home";
import type { HomeSummary, SessionSetup, SetupProgress } from "./types";

// The API where it has endpoints (DATA_SOURCE=api), else sample data.
const impl = LIVE ? live : fake;

/** The current session and its terms; unsaved schools get suggested dates. Null for non-members. */
export function getSession(subdomain: string): Promise<SessionSetup | null> {
  return impl.getSession(subdomain);
}

/** The plan's six setup steps, which are done, and whether the checklist is hidden. */
export function getSetupProgress(subdomain: string): Promise<SetupProgress | null> {
  return impl.getSetupProgress(subdomain);
}

/** Counts for Home (students, classes, arms, subjects, admins) and the latest changes. */
export function getHomeSummary(subdomain: string): Promise<HomeSummary | null> {
  return impl.getHomeSummary(subdomain);
}
