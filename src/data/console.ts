// The Brillianda team console (batch 13; docs/data-contract.md). Screens import from here, never from fake/.
import "server-only";
import * as impl from "./fake/console";
import type { ConsoleOverview, ConsoleSchool, ConsoleSchoolDetail, TeamMember, TrialRequestRow } from "./types";

/** The signed-in team member, or null. Team accounts are separate from school accounts. */
export function getTeamMember(): Promise<TeamMember | null> {
  return impl.getTeamMember();
}

/** Totals across schools, trial requests waiting, newest schools and the team's recent activity. */
export function getConsoleOverview(): Promise<ConsoleOverview | null> {
  return impl.getConsoleOverview();
}

/** Every school: status, owner, size and setup progress. Counts only, never a student's record. */
export function listConsoleSchools(): Promise<ConsoleSchool[] | null> {
  return impl.listConsoleSchools();
}

/** One school's summary. Opening it is recorded in that school's own change history (plan: safeguards). */
export function getConsoleSchool(subdomain: string): Promise<ConsoleSchoolDetail | null> {
  return impl.getConsoleSchool(subdomain);
}

/** Requests from the marketing site's trial form, newest first. */
export function listTrialRequests(): Promise<TrialRequestRow[] | null> {
  return impl.listTrialRequests();
}
