// FAKE: the Brillianda team console (batch 13) on sample data. Team accounts are separate from
// school accounts: a school's owner can't sign in here, and the team can't sign in to a school.
// The plan's rule: "Brillianda staff reach a school's data only through the admin console, with
// each access logged and shown to the school" — opening a school here writes to its own history.
import "server-only";
import { cookies } from "next/headers";
import type { ActionResult, ConsoleOverview, ConsoleSchool, ConsoleSchoolDetail, TeamMember, TrialRequestRow, TrialStatus } from "../types";
import { recordChange } from "./changes";
import { store } from "./store";

const TEAM_COOKIE = "brillianda_team";
const pause = () => new Promise((resolve) => setTimeout(resolve, 300));
const fail = (error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> => ({ ok: false, error, fieldErrors });

/** Seeded times are "minutes before the first read"; fix them to real times once. */
function fixTimes() {
  const now = Date.now();
  for (const t of store.trialRequests) if (t.at <= 0) t.at = now + t.at * 60_000;
  for (const meta of store.schoolMeta.values()) {
    if (meta.createdAt <= 0) meta.createdAt = now + meta.createdAt * 60_000;
    if (meta.statusNote && meta.statusNote.at <= 0) meta.statusNote.at = now + meta.statusNote.at * 60_000;
  }
}

async function currentTeamUser() {
  const token = (await cookies()).get(TEAM_COOKIE)?.value;
  const session = token ? store.teamSessions.get(token) : undefined;
  return (session && store.teamUsers.find((u) => u.id === session.teamUserId)) || null;
}

export async function getTeamMember(): Promise<TeamMember | null> {
  const user = await currentTeamUser();
  return user ? { id: user.id, fullName: user.fullName, email: user.email } : null;
}

export async function teamSignIn(email: string, password: string): Promise<ActionResult<null>> {
  await pause();
  const user = store.teamUsers.find((u) => u.email === email.trim().toLowerCase());
  if (!user || user.password !== password) return fail("That email and password don’t match a team account.");
  const token = crypto.randomUUID();
  store.teamSessions.set(token, { teamUserId: user.id });
  (await cookies()).set({ name: TEAM_COOKIE, value: token, httpOnly: true, sameSite: "strict", path: "/console" });
  return { ok: true, data: null };
}

export async function teamSignOut(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(TEAM_COOKIE)?.value;
  if (token) store.teamSessions.delete(token);
  jar.delete({ name: TEAM_COOKIE, path: "/console" });
}

// ——— What the console reads ———

function setupOf(subdomain: string) {
  const team = store.users.filter((u) => u.schools.some((s) => s.subdomain === subdomain && (s.role === "owner" || s.role === "admin"))).length;
  return [
    { label: "Calendar", done: store.calendars.get(subdomain)?.confirmed ?? false },
    { label: "Classes", done: store.levels.some((l) => l.subdomain === subdomain) },
    { label: "Arms", done: store.arms.some((a) => a.subdomain === subdomain) },
    { label: "Subjects", done: store.subjectLinks.some((l) => l.subdomain === subdomain) },
    { label: "Students", done: store.students.some((s) => s.subdomain === subdomain && !s.deletedAt) },
    { label: "Admins", done: team > 1 || store.invites.some((i) => i.subdomain === subdomain) },
    { label: "Branding", done: store.brandingSaved.has(subdomain) },
  ];
}

function rowOf(subdomain: string): ConsoleSchool | null {
  const school = store.schools.find((s) => s.subdomain === subdomain);
  if (!school) return null;
  const owner = store.users.find((u) => u.schools.some((s) => s.subdomain === subdomain && s.role === "owner"));
  const setup = setupOf(subdomain);
  return {
    subdomain,
    name: school.name,
    status: school.status,
    createdAt: store.schoolMeta.get(subdomain)?.createdAt ?? null,
    owner: owner ? { fullName: owner.fullName, email: owner.email } : null,
    students: store.students.filter((s) => s.subdomain === subdomain && !s.deletedAt && s.status === "active").length,
    classes: store.arms.filter((a) => a.subdomain === subdomain && !a.archived).length,
    setupDone: setup.filter((i) => i.done).length,
    setupTotal: setup.length,
  };
}

export async function getConsoleOverview(): Promise<ConsoleOverview | null> {
  if (!(await currentTeamUser())) return null;
  fixTimes();
  const rows = store.schools.map((s) => rowOf(s.subdomain)!);
  const weekAgo = Date.now() - 7 * 86_400_000;
  const signups = store.changes
    .filter((c) => c.what === "Created the school" && c.at > 0)
    .map((c) => ({ at: c.at, who: c.who, what: `${store.schools.find((s) => s.subdomain === c.subdomain)?.name ?? c.subdomain} signed up`, subdomain: c.subdomain }));
  return {
    schools: {
      active: rows.filter((r) => r.status === "active").length,
      suspended: rows.filter((r) => r.status === "suspended").length,
      newThisWeek: rows.filter((r) => r.createdAt !== null && r.createdAt > weekAgo).length,
    },
    students: rows.reduce((n, r) => n + r.students, 0),
    trialsWaiting: store.trialRequests.filter((t) => t.status === "new").length,
    recentSchools: [...rows].sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)).slice(0, 5),
    activity: [...store.teamLog, ...signups].sort((a, b) => b.at - a.at).slice(0, 12),
  };
}

export async function listConsoleSchools(): Promise<ConsoleSchool[] | null> {
  if (!(await currentTeamUser())) return null;
  fixTimes();
  return store.schools.map((s) => rowOf(s.subdomain)!).sort((a, b) => a.name.localeCompare(b.name));
}

/** One school's summary. Opening it is recorded in the school's own change history. */
export async function getConsoleSchool(subdomain: string): Promise<ConsoleSchoolDetail | null> {
  const team = await currentTeamUser();
  if (!team) return null;
  fixTimes();
  const row = rowOf(subdomain);
  if (!row) return null;
  const roleCount = (role: string) => store.users.filter((u) => u.schools.some((s) => s.subdomain === subdomain && s.role === role)).length;
  const profile = store.profiles.get(subdomain);
  // Once an hour per person is enough to show the school who looked.
  const lastLook = store.changes.findLast((c) => c.subdomain === subdomain && c.who === `${team.fullName} (Brillianda)`);
  if (!lastLook || Date.now() - lastLook.at > 3_600_000) recordChange(subdomain, `${team.fullName} (Brillianda)`, "Viewed the school’s summary from the Brillianda team console");
  return {
    ...row,
    state: profile?.state ?? null,
    phone: profile?.phone ?? null,
    levelsOffered: profile?.levelsOffered ?? [],
    admins: roleCount("admin") + roleCount("owner"),
    teachers: roleCount("teacher"),
    parents: roleCount("parent"),
    subjects: store.subjects.filter((s) => s.subdomain === subdomain).length,
    setup: setupOf(subdomain),
    statusNote: store.schoolMeta.get(subdomain)?.statusNote ?? null,
  };
}

/** Pause a school (its people can't sign in; its records stay) or bring it back. A reason is required. */
export async function setSchoolStatus(subdomain: string, status: "active" | "suspended", reason: string): Promise<ActionResult<null>> {
  await pause();
  const team = await currentTeamUser();
  if (!team) return fail("Sign in to the team console first.");
  const school = store.schools.find((s) => s.subdomain === subdomain);
  if (!school) return fail("That school isn’t here any more.");
  if (school.status === status) return fail(status === "suspended" ? "It’s already paused." : "It’s already active.");
  school.status = status;
  const meta = store.schoolMeta.get(subdomain) ?? { createdAt: Date.now() };
  meta.statusNote = { status, reason, by: team.fullName, at: Date.now() };
  store.schoolMeta.set(subdomain, meta);
  const what = status === "suspended" ? `Paused the school’s account: ${reason}` : `Reactivated the school’s account: ${reason}`;
  recordChange(subdomain, `${team.fullName} (Brillianda)`, what);
  store.teamLog.push({ at: Date.now(), who: team.fullName, what: `${status === "suspended" ? "Paused" : "Reactivated"} ${school.name}: ${reason}`, subdomain });
  return { ok: true, data: null };
}

export async function listTrialRequests(): Promise<TrialRequestRow[] | null> {
  if (!(await currentTeamUser())) return null;
  fixTimes();
  return [...store.trialRequests]
    .sort((a, b) => b.at - a.at)
    .map((t) => ({ ...t, state: t.state ?? null, message: t.message ?? null, note: t.note ?? null }));
}

export async function setTrialStatus(id: string, status: TrialStatus, note: string): Promise<ActionResult<null>> {
  await pause();
  const team = await currentTeamUser();
  if (!team) return fail("Sign in to the team console first.");
  const request = store.trialRequests.find((t) => t.id === id);
  if (!request) return fail("That request isn’t here any more.");
  request.status = status;
  request.note = note || undefined;
  store.teamLog.push({ at: Date.now(), who: team.fullName, what: `Marked ${request.schoolName}’s trial request ${status}${note ? `: ${note}` : ""}` });
  return { ok: true, data: null };
}
