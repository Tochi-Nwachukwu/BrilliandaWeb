// Signing in and the school's team, on the Brillianda API. Same functions and shapes as
// ../fake/auth.ts. The API keeps the session; we keep its cookie per school (client.ts).
import "server-only";
import { cache } from "react";
import type { ActionResult, InviteDetails, SampleEmail, SchoolMember, SchoolSummary, SignedInMember } from "../types";
import { api, dropCookies, fail, read } from "./client";
import { outboxSample } from "./outbox";
import { pictureOn } from "./school";

export type Me = {
  user: { id: string; email: string; fullName: string };
  membership: { role: "owner" | "admin" | "teacher" | "parent" | "student" };
  school: { name: string; subdomain: string };
  /** An address for <img src> (like the logo's), or null. */
  photo?: string | null;
  phone?: string | null;
};

const CREDENTIALS_DONT_MATCH = "That email and password don’t match.";
const LINK_EXPIRED = "This link has expired or was already used. Ask for a new one.";

/** Who is signed in at this school (`GET /v1/me`), asked once per page render however many parts need it. */
export const readMe = cache((subdomain: string) => read<Me>(subdomain, "/v1/me"));

export const getCurrentMember = cache(async (subdomain: string): Promise<SignedInMember | null> => {
  const me = await readMe(subdomain);
  return me ? { userId: me.user.id, fullName: me.user.fullName, email: me.user.email, role: me.membership.role, photo: pictureOn(subdomain, me.photo ?? null) } : null;
});

/**
 * The school picker on brillianda.com/login. Sessions belong to each school's address, so the main
 * site never has one: people find their school by email instead (findMySchool).
 */
export async function getMySchools(): Promise<SchoolSummary[]> {
  return [];
}

export async function signIn(subdomain: string, email: string, password: string): Promise<ActionResult<null>> {
  const result = await api(subdomain, "/v1/auth/login", { method: "POST", body: { email, password } });
  if (result.ok) return { ok: true, data: null };
  return result.problem.code === "invalid_credentials" ? { ok: false, error: CREDENTIALS_DONT_MATCH } : fail(result);
}

export async function signOut(subdomain?: string): Promise<void> {
  if (!subdomain) return;
  await api(subdomain, "/v1/auth/logout", { method: "POST" });
  await dropCookies(subdomain);
}

export async function requestPasswordReset(subdomain: string, email: string): Promise<ActionResult<SampleEmail>> {
  const since = Date.now();
  const result = await api(subdomain, "/v1/auth/password-reset", { method: "POST", body: { email } });
  return result.ok ? { ok: true, data: await outboxSample(email, since) } : fail(result);
}

export async function sendMagicLink(subdomain: string, email: string): Promise<ActionResult<SampleEmail>> {
  const since = Date.now();
  const result = await api(subdomain, "/v1/auth/magic-link", { method: "POST", body: { email } });
  return result.ok ? { ok: true, data: await outboxSample(email, since) } : fail(result);
}

export async function resetPassword(subdomain: string, token: string, password: string): Promise<ActionResult<null>> {
  const result = await api(subdomain, "/v1/auth/password-reset/confirm", { method: "POST", body: { token, password } });
  if (result.ok) return { ok: true, data: null };
  return result.problem.code === "link_invalid" ? { ok: false, error: LINK_EXPIRED } : fail(result);
}

export async function signInWithLink(subdomain: string, token: string): Promise<ActionResult<null>> {
  const result = await api(subdomain, "/v1/auth/magic-link/confirm", { method: "POST", body: { token } });
  if (result.ok) return { ok: true, data: null };
  return result.problem.code === "link_invalid" ? { ok: false, error: LINK_EXPIRED } : fail(result);
}

export async function findMySchool(email: string): Promise<ActionResult<SampleEmail>> {
  const since = Date.now();
  const result = await api(null, "/v1/auth/find-school", { method: "POST", body: { email } });
  return result.ok ? { ok: true, data: await outboxSample(email, since) } : fail(result);
}

type Lookup = { email: string; role: "owner" | "admin"; school: { name: string }; invitedBy: string | null; existingAccount: boolean };

export async function getInvite(subdomain: string, token: string): Promise<InviteDetails | null> {
  const result = await api<Lookup>(subdomain, "/v1/invitations/lookup", { query: { token } });
  if (result.ok) {
    const i = result.data;
    // The API's invites carry no name: the person gives theirs when they accept.
    return { schoolName: i.school.name, fullName: "", email: i.email, status: "open", hasAccount: i.existingAccount, role: "admin" };
  }
  if (result.problem.code !== "link_invalid") return null;
  const school = await read<{ name: string }>(subdomain, "/v1/school");
  return school ? { schoolName: school.name, fullName: "", email: "", status: "expired", hasAccount: false, role: "admin" } : null;
}

export async function acceptInvite(subdomain: string, token: string, password: string, fullName?: string): Promise<ActionResult<null>> {
  const result = await api(subdomain, "/v1/invitations/accept", { method: "POST", body: { token, password, ...(fullName ? { fullName } : {}) } });
  if (result.ok) return { ok: true, data: null };
  if (result.problem.code === "link_invalid") return { ok: false, error: "This invite can’t be used any more. Ask the school owner to send a new one." };
  if (result.problem.code === "invalid_credentials") {
    return { ok: false, error: "That password doesn’t match your Brillianda account.", fieldErrors: { password: ["That password doesn’t match your Brillianda account"] } };
  }
  return fail(result);
}

type Member = { userId: string; fullName: string; email: string; role: "owner" | "admin" | "teacher" | "parent" | "student"; joinedAt: string };
type Invitation = { id: string; email: string; fullName?: string | null; role: "owner" | "admin" | "teacher" | "parent" | "student"; createdAt: string };

export async function listMembers(subdomain: string): Promise<SchoolMember[]> {
  const [members, invites] = await Promise.all([
    read<{ data: Member[] }>(subdomain, "/v1/members"),
    read<{ data: Invitation[] }>(subdomain, "/v1/invitations"),
  ]);
  // Admins only: teachers have their own page, parents theirs.
  const active: SchoolMember[] = (members?.data ?? []).filter((m) => m.role === "owner" || m.role === "admin").map((m) => ({ id: m.userId, fullName: m.fullName, email: m.email, role: m.role, status: "active" }));
  const invited: SchoolMember[] = (invites?.data ?? []).filter((i) => i.role === "admin").map((i) => ({ id: i.id, fullName: i.fullName || i.email, email: i.email, role: "admin", status: "invited", invitedAt: Date.parse(i.createdAt) }));
  return [...active, ...invited];
}

export async function inviteAdmin(subdomain: string, _fullName: string, email: string): Promise<ActionResult<SampleEmail & { resent: boolean }>> {
  const since = Date.now();
  const result = await api(subdomain, "/v1/invitations", { method: "POST", body: { email, role: "admin" } });
  if (result.ok) return { ok: true, data: { resent: false, ...(await outboxSample(email, since)) } };
  if (result.problem.code === "conflict") return { ok: false, error: result.problem.detail ?? "They’re already on the team.", fieldErrors: { email: [result.problem.detail ?? "Already on the team"] } };
  return fail(result);
}

export async function cancelInvite(subdomain: string, inviteId: string): Promise<ActionResult<null>> {
  const result = await api(subdomain, `/v1/invitations/${encodeURIComponent(inviteId)}`, { method: "DELETE" });
  return result.ok ? { ok: true, data: null } : fail(result);
}

export async function removeAdmin(subdomain: string, userId: string): Promise<ActionResult<null>> {
  const result = await api(subdomain, `/v1/members/${encodeURIComponent(userId)}`, { method: "DELETE" });
  return result.ok ? { ok: true, data: null } : fail(result);
}

export async function exchangeHandover(subdomain: string, token: string): Promise<ActionResult<null>> {
  const result = await api(subdomain, "/v1/auth/handover", { method: "POST", body: { token } });
  if (result.ok) return { ok: true, data: null };
  return result.problem.code === "link_invalid" ? { ok: false, error: "This link has expired. Sign in with the email and password you just chose." } : fail(result);
}
