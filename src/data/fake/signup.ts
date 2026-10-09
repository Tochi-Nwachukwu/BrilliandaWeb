// FAKE: signup on sample data. Drafts live in memory under a cookie; any 6-digit code works
// except 000000 (to show the error); some names are "taken". The backend replaces this with
// stored drafts, Resend for the code, Turnstile on the owner step, rate limits and one database
// transaction on Create, then the one-time handover to the new subdomain.
import "server-only";
import {
  alternativeSubdomains,
  CODE_LIFETIME_SECONDS,
  defaultTerms,
  normaliseSubdomain,
  RESEND_AFTER_SECONDS,
  subdomainProblem,
  type OwnerAccount,
  type SchoolDetails,
} from "@brillianda/core";
import { cookies } from "next/headers";
import type { ActionResult, SignupDraft, SubdomainCheck } from "../types";
import { recordChange } from "./changes";
import { store, type FakeSignupDraft } from "./store";

const COOKIE = "brillianda_signup";
const SESSION_COOKIE = "brillianda_session";

async function draftId(create: boolean): Promise<string | null> {
  const jar = await cookies();
  const existing = jar.get(COOKIE)?.value;
  if (existing && store.signupDrafts.has(existing)) return existing;
  if (!create) return null;
  const id = crypto.randomUUID();
  store.signupDrafts.set(id, { emailVerified: false });
  jar.set({ name: COOKIE, value: id, httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
  return id;
}

function stepOf(draft: FakeSignupDraft): SignupDraft["step"] {
  if (!draft.school) return "school";
  if (!draft.owner) return "owner";
  if (!draft.emailVerified) return "verify";
  return "address";
}

function publicDraft(draft: FakeSignupDraft): SignupDraft {
  return {
    step: stepOf(draft),
    school: draft.school ?? null,
    owner: draft.owner ? { fullName: draft.owner.fullName, email: draft.owner.email } : null,
    codeSentAt: draft.codeSentAt ?? null,
    emailVerified: draft.emailVerified,
  };
}

export async function getSignupDraft(): Promise<SignupDraft | null> {
  const id = await draftId(false);
  const draft = id ? store.signupDrafts.get(id) : undefined;
  return draft ? publicDraft(draft) : null;
}

const pause = () => new Promise((resolve) => setTimeout(resolve, 400));

export async function saveSchoolDetails(input: SchoolDetails): Promise<ActionResult<SignupDraft>> {
  await pause();
  const id = (await draftId(true))!;
  const draft = store.signupDrafts.get(id)!;
  draft.school = input;
  return { ok: true, data: publicDraft(draft) };
}

export async function saveOwnerAccount(input: OwnerAccount): Promise<ActionResult<SignupDraft>> {
  await pause();
  const id = await draftId(false);
  const draft = id ? store.signupDrafts.get(id) : undefined;
  if (!draft?.school) return { ok: false, error: "Start with your school’s details." };
  const emailChanged = draft.owner?.email !== input.email;
  draft.owner = { fullName: input.fullName, email: input.email, password: input.password };
  // A new address needs a new code; the same one keeps its timer.
  if (emailChanged || !draft.codeSentAt) {
    draft.codeSentAt = Date.now();
    draft.emailVerified = false;
  }
  return { ok: true, data: publicDraft(draft) };
}

export async function resendSignupCode(): Promise<ActionResult<SignupDraft>> {
  await pause();
  const id = await draftId(false);
  const draft = id ? store.signupDrafts.get(id) : undefined;
  if (!draft?.owner) return { ok: false, error: "Add your account details first." };
  const wait = RESEND_AFTER_SECONDS * 1000 - (Date.now() - (draft.codeSentAt ?? 0));
  if (wait > 0) return { ok: false, error: `You can ask for a new code in ${Math.ceil(wait / 1000)} seconds.` };
  draft.codeSentAt = Date.now();
  return { ok: true, data: publicDraft(draft) };
}

export async function verifySignupEmail(code: string): Promise<ActionResult<SignupDraft>> {
  await pause();
  const id = await draftId(false);
  const draft = id ? store.signupDrafts.get(id) : undefined;
  if (!draft?.owner || !draft.codeSentAt) return { ok: false, error: "Add your account details first." };
  if (Date.now() - draft.codeSentAt > CODE_LIFETIME_SECONDS * 1000) {
    return { ok: false, error: "That code has expired. Ask for a new one.", fieldErrors: { code: ["That code has expired"] } };
  }
  if (code === "000000") return { ok: false, error: "That code isn’t right.", fieldErrors: { code: ["That code isn’t right. Check the email and try again."] } };
  draft.emailVerified = true;
  return { ok: true, data: publicDraft(draft) };
}

function isTaken(name: string) {
  return store.schools.some((s) => s.subdomain === name);
}

export async function checkSubdomain(input: string, state?: string): Promise<SubdomainCheck> {
  await new Promise((resolve) => setTimeout(resolve, 250));
  const subdomain = normaliseSubdomain(input);
  const problem = subdomainProblem(subdomain);
  const free = (names: string[]) => names.filter((n) => !isTaken(n)).slice(0, 3);
  if (problem) {
    const suggestions = problem.reason === "reserved" ? free(alternativeSubdomains(subdomain, state)) : [];
    return { available: false, subdomain, reason: problem.reason, message: problem.message, suggestions };
  }
  if (isTaken(subdomain)) {
    return { available: false, subdomain, reason: "taken", message: "Another school has this address", suggestions: free(alternativeSubdomains(subdomain, state)) };
  }
  return { available: true, subdomain };
}

export async function createSchool(subdomain: string): Promise<ActionResult<{ subdomain: string; url: string }>> {
  await pause();
  const jar = await cookies();
  const id = await draftId(false);
  const draft = id ? store.signupDrafts.get(id) : undefined;
  if (!draft?.school || !draft.owner || !draft.emailVerified) return { ok: false, error: "Some earlier steps aren’t finished yet." };

  const check = await checkSubdomain(subdomain, draft.school.state);
  if (!check.available) return { ok: false, error: check.message, fieldErrors: { subdomain: [check.message] } };

  store.schools.push({ subdomain: check.subdomain, name: draft.school.schoolName, status: "active", brandColor: "#4A3AA7", logoUrl: null });
  let user = store.users.find((u) => u.email === draft.owner!.email);
  if (!user) {
    user = { id: crypto.randomUUID(), fullName: draft.owner.fullName, email: draft.owner.email, password: draft.owner.password, schools: [] };
    store.users.push(user);
  }
  user.schools.push({ subdomain: check.subdomain, role: "owner" });
  // Suggested dates for the session they said they start in; confirmed from the checklist.
  store.profiles.set(check.subdomain, { levelsOffered: draft.school.levels, state: draft.school.state, phone: draft.school.phone });
  store.calendars.set(check.subdomain, { confirmed: false, startYear: draft.school.sessionStartYear, terms: defaultTerms(draft.school.sessionStartYear) });
  recordChange(check.subdomain, user.fullName, "Created the school");

  // Signed straight in. For real this is a one-time token exchanged on the new subdomain.
  const token = crypto.randomUUID();
  store.sessions.set(token, { userId: user.id });
  jar.set({ name: SESSION_COOKIE, value: token, httpOnly: true, sameSite: "lax", path: "/" });
  store.signupDrafts.delete(id!);
  jar.delete(COOKIE);

  return { ok: true, data: { subdomain: check.subdomain, url: `/s/${check.subdomain}` } };
}
