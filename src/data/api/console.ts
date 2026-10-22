// The Brillianda team console, on the Brillianda API. Same functions and shapes as
// ../fake/console.ts. Every call is from the main site (school null); the team's session cookie
// is kept with the main site's, never a school's.
import "server-only";
import type { ActionResult, ConsoleOverview, ConsoleSchool, ConsoleSchoolDetail, TeamMember, TrialRequestRow, TrialStatus } from "../types";
import { cookies } from "next/headers";
import { api, fail, read } from "./client";

const id = encodeURIComponent;

export async function getTeamMember(): Promise<TeamMember | null> {
  return read<TeamMember>(null, "/v1/team/me");
}

export async function teamSignIn(email: string, password: string): Promise<ActionResult<null>> {
  const result = await api<TeamMember>(null, "/v1/team/login", { method: "POST", body: { email, password } });
  if (result.ok) return { ok: true, data: null };
  if (result.problem.code === "invalid_credentials") return { ok: false, error: "That email and password don’t match." };
  return fail(result);
}

export async function teamSignOut(): Promise<void> {
  await api(null, "/v1/team/logout", { method: "POST" });
  const jar = await cookies();
  // Only the team's cookie: a signup in progress on the main site keeps its own.
  for (const c of jar.getAll()) if (c.name.includes("bd_team")) jar.delete(c.name);
}

export async function getConsoleOverview(): Promise<ConsoleOverview | null> {
  return read<ConsoleOverview>(null, "/v1/team/overview");
}

export async function listConsoleSchools(): Promise<ConsoleSchool[] | null> {
  return read<ConsoleSchool[]>(null, "/v1/team/schools");
}

export async function getConsoleSchool(subdomain: string): Promise<ConsoleSchoolDetail | null> {
  return read<ConsoleSchoolDetail>(null, `/v1/team/schools/${id(subdomain)}`);
}

export async function setSchoolStatus(subdomain: string, status: "active" | "suspended", reason: string): Promise<ActionResult<null>> {
  const result = await api(null, `/v1/team/schools/${id(subdomain)}/status`, { method: "PUT", body: { status, reason } });
  return result.ok ? { ok: true, data: null } : fail(result);
}

export async function listTrialRequests(): Promise<TrialRequestRow[] | null> {
  return read<TrialRequestRow[]>(null, "/v1/team/trial-requests");
}

export async function setTrialStatus(requestId: string, status: TrialStatus, note: string): Promise<ActionResult<null>> {
  const result = await api(null, `/v1/team/trial-requests/${id(requestId)}`, { method: "PATCH", body: { status, note } });
  return result.ok ? { ok: true, data: null } : fail(result);
}

