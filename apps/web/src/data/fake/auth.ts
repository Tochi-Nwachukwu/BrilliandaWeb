// FAKE: signing in and the school's team, on sample data. Better Auth replaces the sessions,
// passwords, reset and email links; the backend replaces invites and members. Sessions here are
// one cookie for every school; for real they are host-only per subdomain, so the membership check
// below is what keeps schools apart in the fake.
import "server-only";
import { INVITE_LIFETIME_HOURS, LINK_LIFETIME_MINUTES } from "@brillianda/core";
import { cookies } from "next/headers";
import type { ActionResult, InviteDetails, SampleEmail, SchoolMember, SchoolRole, SchoolSummary, SignedInMember } from "../types";
import { recordChange } from "./changes";
import { store, type FakeUser } from "./store";

const SESSION_COOKIE = "brillianda_session";
const CREDENTIALS_DONT_MATCH = "That email and password don’t match.";
const pause = () => new Promise((resolve) => setTimeout(resolve, 350));

function seedTimes() {
  for (const invite of store.invites) if (!invite.createdAt) invite.createdAt = Date.now();
}

async function currentUser(): Promise<FakeUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = token ? store.sessions.get(token) : undefined;
  return (session && store.users.find((u) => u.id === session.userId)) || null;
}

function roleIn(user: FakeUser, subdomain: string): SchoolRole | null {
  return user.schools.find((s) => s.subdomain === subdomain)?.role ?? null;
}

async function startSession(user: FakeUser) {
  const token = crypto.randomUUID();
  store.sessions.set(token, { userId: user.id });
  (await cookies()).set({ name: SESSION_COOKIE, value: token, httpOnly: true, sameSite: "lax", path: "/" });
}

const byEmail = (email: string) => store.users.find((u) => u.email === email);

export async function getCurrentMember(subdomain: string): Promise<SignedInMember | null> {
  const user = await currentUser();
  const role = user && roleIn(user, subdomain);
  return user && role ? { userId: user.id, fullName: user.fullName, email: user.email, role } : null;
}

export async function getMySchools(): Promise<SchoolSummary[]> {
  const user = await currentUser();
  if (!user) return [];
  return user.schools.map((m) => store.schools.find((s) => s.subdomain === m.subdomain)).filter((s): s is SchoolSummary => !!s && s.status === "active");
}

export async function signIn(subdomain: string, email: string, password: string): Promise<ActionResult<null>> {
  await pause();
  const user = byEmail(email);
  // An unknown email, a wrong password and someone from another school all read the same.
  if (!user || user.password !== password || !roleIn(user, subdomain)) return { ok: false, error: CREDENTIALS_DONT_MATCH };
  await startSession(user);
  return { ok: true, data: null };
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) store.sessions.delete(token);
  jar.delete(SESSION_COOKIE);
}

function makeLink(kind: "reset" | "magic", user: FakeUser, subdomain: string): string {
  const token = crypto.randomUUID();
  store.links.set(token, { kind, userId: user.id, subdomain, createdAt: Date.now() });
  return kind === "reset" ? `/s/${subdomain}/reset-password/${token}` : `/s/${subdomain}/magic/${token}`;
}

/** Always answers the same way, so it can't be used to find out who has an account. */
export async function requestPasswordReset(subdomain: string, email: string): Promise<ActionResult<SampleEmail>> {
  await pause();
  const user = byEmail(email);
  if (!user || !roleIn(user, subdomain)) return { ok: true, data: {} };
  return { ok: true, data: { sampleLinks: [{ label: "Open the reset link", href: makeLink("reset", user, subdomain) }] } };
}

export async function sendMagicLink(subdomain: string, email: string): Promise<ActionResult<SampleEmail>> {
  await pause();
  const user = byEmail(email);
  if (!user || !roleIn(user, subdomain)) return { ok: true, data: {} };
  return { ok: true, data: { sampleLinks: [{ label: "Open the sign-in link", href: makeLink("magic", user, subdomain) }] } };
}

function consumeLink(kind: "reset" | "magic", subdomain: string, token: string): FakeUser | null {
  const link = store.links.get(token);
  if (!link || link.kind !== kind || link.subdomain !== subdomain || link.usedAt) return null;
  if (Date.now() - link.createdAt > LINK_LIFETIME_MINUTES * 60 * 1000) return null;
  link.usedAt = Date.now();
  return store.users.find((u) => u.id === link.userId) ?? null;
}

export async function resetPassword(subdomain: string, token: string, password: string): Promise<ActionResult<null>> {
  await pause();
  const user = consumeLink("reset", subdomain, token);
  if (!user) return { ok: false, error: "This link has expired or has been used. Ask for a new one." };
  user.password = password;
  // Signed out everywhere else.
  for (const [key, session] of store.sessions) if (session.userId === user.id) store.sessions.delete(key);
  return { ok: true, data: null };
}

export async function signInWithLink(subdomain: string, token: string): Promise<ActionResult<null>> {
  await pause();
  const user = consumeLink("magic", subdomain, token);
  if (!user) return { ok: false, error: "This link has expired or has been used. Ask for a new one." };
  await startSession(user);
  return { ok: true, data: null };
}

/** Find my school: always the same answer; the fake shows what the email would list. */
export async function findMySchool(email: string): Promise<ActionResult<SampleEmail>> {
  await pause();
  const user = byEmail(email);
  const schools = user ? user.schools.map((m) => store.schools.find((s) => s.subdomain === m.subdomain)).filter((s): s is SchoolSummary => !!s && s.status === "active") : [];
  return { ok: true, data: { sampleLinks: schools.map((s) => ({ label: s.name, href: `/s/${s.subdomain}/login` })) } };
}

function openInvite(subdomain: string, token: string) {
  seedTimes();
  return store.invites.find((i) => i.token === token && i.subdomain === subdomain);
}

const expired = (createdAt: number) => Date.now() - createdAt > INVITE_LIFETIME_HOURS * 60 * 60 * 1000;

export async function getInvite(subdomain: string, token: string): Promise<InviteDetails | null> {
  const invite = openInvite(subdomain, token);
  const school = store.schools.find((s) => s.subdomain === subdomain);
  if (!invite || !school) return null;
  return {
    schoolName: school.name,
    fullName: invite.fullName,
    email: invite.email,
    status: invite.usedAt ? "used" : expired(invite.createdAt) ? "expired" : "open",
    hasAccount: !!byEmail(invite.email),
  };
}

export async function acceptInvite(subdomain: string, token: string, password: string): Promise<ActionResult<null>> {
  await pause();
  const invite = openInvite(subdomain, token);
  if (!invite || invite.usedAt || expired(invite.createdAt)) return { ok: false, error: "This invite can’t be used any more. Ask the school owner to send a new one." };
  let user = byEmail(invite.email);
  if (user) {
    // Someone already on Brillianda (another school) signs in with their own password.
    if (user.password !== password) return { ok: false, error: "That password doesn’t match your Brillianda account.", fieldErrors: { password: ["That password doesn’t match your Brillianda account"] } };
  } else {
    user = { id: crypto.randomUUID(), fullName: invite.fullName, email: invite.email, password, schools: [] };
    store.users.push(user);
  }
  if (!roleIn(user, subdomain)) user.schools.push({ subdomain, role: "admin" });
  invite.usedAt = Date.now();
  recordChange(subdomain, user.fullName, "Joined as an admin");
  await startSession(user);
  return { ok: true, data: null };
}

/** The signed-in person if they belong to this school (with this role, if given); else null. */
export async function requireMember(subdomain: string, role?: SchoolRole) {
  const user = await currentUser();
  const has = user && roleIn(user, subdomain);
  if (!user || !has || (role && has !== role)) return null;
  return user;
}

export async function listMembers(subdomain: string): Promise<SchoolMember[]> {
  if (!(await requireMember(subdomain))) return [];
  seedTimes();
  const active: SchoolMember[] = store.users
    .filter((u) => roleIn(u, subdomain))
    .map((u) => ({ id: u.id, fullName: u.fullName, email: u.email, role: roleIn(u, subdomain)!, status: "active" }));
  const invited: SchoolMember[] = store.invites
    .filter((i) => i.subdomain === subdomain && !i.usedAt)
    .map((i) => ({ id: i.id, fullName: i.fullName, email: i.email, role: "admin", status: "invited", invitedAt: i.createdAt }));
  const order = (m: SchoolMember) => (m.role === "owner" ? 0 : m.status === "active" ? 1 : 2);
  return [...active, ...invited].sort((a, b) => order(a) - order(b) || a.fullName.localeCompare(b.fullName));
}

const OWNER_ONLY = "Only the school owner can do this.";

export async function inviteAdmin(subdomain: string, fullName: string, email: string): Promise<ActionResult<SampleEmail & { resent: boolean }>> {
  await pause();
  const owner = await requireMember(subdomain, "owner");
  if (!owner) return { ok: false, error: OWNER_ONLY };
  const existing = byEmail(email);
  if (existing && roleIn(existing, subdomain)) return { ok: false, error: "They’re already on the team.", fieldErrors: { email: ["Already on the team"] } };
  const pending = store.invites.find((i) => i.subdomain === subdomain && i.email === email && !i.usedAt);
  const token = crypto.randomUUID();
  if (pending) {
    pending.token = token;
    pending.createdAt = Date.now();
    pending.fullName = fullName;
  } else {
    store.invites.push({ id: crypto.randomUUID(), token, subdomain, fullName, email, createdAt: Date.now() });
  }
  recordChange(subdomain, owner.fullName, pending ? `Sent ${fullName} a fresh invite` : `Invited ${fullName} as an admin`);
  return { ok: true, data: { resent: !!pending, sampleLinks: [{ label: "Open the invite link", href: `/s/${subdomain}/invite/${token}` }] } };
}

export async function cancelInvite(subdomain: string, inviteId: string): Promise<ActionResult<null>> {
  await pause();
  if (!(await requireMember(subdomain, "owner"))) return { ok: false, error: OWNER_ONLY };
  store.invites = store.invites.filter((i) => !(i.id === inviteId && i.subdomain === subdomain && !i.usedAt));
  return { ok: true, data: null };
}

export async function removeAdmin(subdomain: string, userId: string): Promise<ActionResult<null>> {
  await pause();
  const owner = await requireMember(subdomain, "owner");
  if (!owner) return { ok: false, error: OWNER_ONLY };
  const user = store.users.find((u) => u.id === userId);
  if (!user || roleIn(user, subdomain) !== "admin") return { ok: false, error: "Only admins can be removed. Ownership moves in a later version." };
  user.schools = user.schools.filter((s) => s.subdomain !== subdomain);
  recordChange(subdomain, owner.fullName, `Removed ${user.fullName} as an admin`);
  return { ok: true, data: null };
}
