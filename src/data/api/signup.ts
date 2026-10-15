// Signup on the Brillianda API (on the main site). Same functions and shapes as ../fake/signup.ts.
// The draft travels in the API's own cookie, kept on our side for the main site (client.ts).
import "server-only";
import { RESEND_AFTER_SECONDS, type OwnerAccount, type SchoolDetails, type SchoolLevel } from "@brillianda/core/signup";
import { normaliseSubdomain, subdomainProblem } from "@brillianda/core/subdomain";
import type { ActionResult, SignupDraft, SubdomainCheck } from "../types";
import { api, fail } from "./client";

type Draft = {
  step: "school" | "owner" | "verify_email" | "address" | "completed";
  // Either may be missing until its step is done.
  school: { name: string; levelsOffered: string[]; state: string | null; phone: string | null; sessionStart: { month: number; year: number } } | null;
  owner: { fullName: string; email: string; phone: string | null } | null;
  emailVerified: boolean;
  codeSentTo: string | null;
  resendAvailableInSec: number;
};

const SCHOOL_FIELDS = { name: "schoolName", levelsOffered: "levels", sessionStart: "sessionStartMonth" };

function draftOf(d: Draft): SignupDraft {
  const step = d.step === "verify_email" ? "verify" : d.step === "completed" ? "address" : d.step;
  return {
    step,
    school: !d.school?.name
      ? null
      : {
          schoolName: d.school.name,
          levels: d.school.levelsOffered.map((l) => l.toUpperCase() as SchoolLevel),
          state: (d.school.state ?? "") as SchoolDetails["state"],
          phone: d.school.phone ?? "",
          sessionStartMonth: d.school.sessionStart.month,
          sessionStartYear: d.school.sessionStart.year,
        },
    owner: d.owner?.email ? { fullName: d.owner.fullName, email: d.owner.email } : null,
    // The API says how long until a new code may be sent; our timers count from when it was sent.
    codeSentAt: d.codeSentTo ? Date.now() - Math.max(0, RESEND_AFTER_SECONDS - d.resendAvailableInSec) * 1000 : null,
    emailVerified: d.emailVerified,
  };
}

export async function getSignupDraft(): Promise<SignupDraft | null> {
  const result = await api<Draft>(null, "/v1/signup");
  return result.ok ? draftOf(result.data) : null;
}

async function step(path: string, body: unknown, rename?: Record<string, string>): Promise<ActionResult<SignupDraft>> {
  const result = await api<Draft>(null, path, { method: "POST", body });
  if (result.ok) return { ok: true, data: draftOf(result.data) };
  if (result.problem.code === "verification_failed") {
    const message = result.problem.detail ?? "That code isn’t right.";
    return { ok: false, error: message, fieldErrors: { code: [message] } };
  }
  return fail(result, rename);
}

export async function saveSchoolDetails(input: SchoolDetails): Promise<ActionResult<SignupDraft>> {
  return step(
    "/v1/signup/school",
    {
      name: input.schoolName,
      levelsOffered: input.levels.map((l) => l.toLowerCase()),
      state: input.state,
      phone: input.phone,
      sessionStart: { month: input.sessionStartMonth, year: input.sessionStartYear },
    },
    SCHOOL_FIELDS,
  );
}

export async function saveOwnerAccount(input: OwnerAccount): Promise<ActionResult<SignupDraft>> {
  return step("/v1/signup/owner", { fullName: input.fullName, email: input.email, password: input.password });
}

export async function resendSignupCode(): Promise<ActionResult<SignupDraft>> {
  return step("/v1/signup/resend-code", undefined);
}

export async function verifySignupEmail(code: string): Promise<ActionResult<SignupDraft>> {
  return step("/v1/signup/verify-email", { code });
}

type Check = { subdomain: string; available: boolean; reason: "taken" | "reserved" | "invalid" | "too_short" | "too_long" | null; suggestions: string[] };

export async function checkSubdomain(input: string): Promise<SubdomainCheck> {
  const subdomain = normaliseSubdomain(input);
  // Our own rules first: no call for a name that can't be used anyway.
  const problem = subdomainProblem(subdomain);
  if (problem && problem.reason === "invalid") return { available: false, subdomain, reason: "invalid", message: problem.message, suggestions: [] };
  const result = await api<Check>(null, "/v1/signup/subdomain-check", { query: { subdomain } });
  if (!result.ok) return { available: false, subdomain, reason: "invalid", message: "We couldn’t check this address. Try again in a moment.", suggestions: [] };
  const c = result.data;
  if (c.available) return { available: true, subdomain: c.subdomain };
  const reason = c.reason === "taken" || c.reason === "reserved" ? c.reason : "invalid";
  const message = reason === "taken" ? "Another school has this address" : (subdomainProblem(c.subdomain)?.message ?? "This address can’t be used");
  return { available: false, subdomain: c.subdomain, reason, message, suggestions: c.suggestions.slice(0, 3) };
}

type Created = { school: { subdomain: string; url: string }; handoverUrl: string };

export async function createSchool(subdomain: string): Promise<ActionResult<{ subdomain: string; url: string }>> {
  const result = await api<Created>(null, "/v1/signup/complete", { method: "POST", body: { subdomain } });
  if (!result.ok) {
    if (result.problem.code === "subdomain_unavailable") {
      const message = result.problem.detail ?? "Another school has this address";
      return { ok: false, error: message, fieldErrors: { subdomain: [message] } };
    }
    return fail(result);
  }
  const created = result.data.school.subdomain;
  // On staging the school's address is the API's stand-in, so the pass is used on our own pages.
  const handover = new URL(result.data.handoverUrl);
  const url = process.env.API_ROOT_DOMAIN ? `/s/${created}${handover.pathname}${handover.search}` : result.data.handoverUrl;
  return { ok: true, data: { subdomain: created, url } };
}
