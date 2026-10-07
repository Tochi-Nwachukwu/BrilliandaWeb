"use server";

// Signing in at a school and getting back in (plan: "Signing in later"; docs/data-contract.md).
//
// About `school`: in development pages live at /s/<school>/…, so the page passes the school it is
// on. The real actions must take the school from the request's host (proxy.ts), never from this
// argument, and check the person belongs to it.
import { emailOnlySchema, fieldErrorsOf, newPasswordSchema, signInSchema } from "@brillianda/core";
import { redirect } from "next/navigation";
import * as impl from "../fake/auth";
import type { ActionResult, SampleEmail } from "../types";

const CHECK_FIELDS = "Please check the highlighted fields.";

export async function signIn(school: string, input: unknown): Promise<ActionResult<null>> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK_FIELDS, fieldErrors: fieldErrorsOf(parsed.error) };
  return impl.signIn(school, parsed.data.email, parsed.data.password);
}

/** Ends the session and goes to the school's sign-in page. */
export async function signOut(school: string): Promise<void> {
  await impl.signOut();
  redirect(`/s/${school}/login`);
}

/** Sends a reset link if the email belongs to someone at this school. Answers the same either way. */
export async function requestPasswordReset(school: string, input: unknown): Promise<ActionResult<SampleEmail>> {
  const parsed = emailOnlySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK_FIELDS, fieldErrors: fieldErrorsOf(parsed.error) };
  return impl.requestPasswordReset(school, parsed.data.email);
}

/** Sets a new password from a reset link and signs the person out everywhere else. */
export async function resetPassword(school: string, token: string, input: unknown): Promise<ActionResult<null>> {
  const parsed = newPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK_FIELDS, fieldErrors: fieldErrorsOf(parsed.error) };
  return impl.resetPassword(school, String(token), parsed.data.password);
}

/** Emails a one-time sign-in link. Answers the same whether or not the email is on file. */
export async function sendMagicLink(school: string, input: unknown): Promise<ActionResult<SampleEmail>> {
  const parsed = emailOnlySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK_FIELDS, fieldErrors: fieldErrorsOf(parsed.error) };
  return impl.sendMagicLink(school, parsed.data.email);
}

/** Uses an emailed sign-in link. A button press, not the page load, so link scanners can't spend it. */
export async function signInWithLink(school: string, token: string): Promise<ActionResult<null>> {
  return impl.signInWithLink(school, String(token));
}

/** brillianda.com/login: emails links to each of the person's schools. Never says whether the email has an account. */
export async function findMySchool(input: unknown): Promise<ActionResult<SampleEmail>> {
  const parsed = emailOnlySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK_FIELDS, fieldErrors: fieldErrorsOf(parsed.error) };
  return impl.findMySchool(parsed.data.email);
}

/** Accepts an admin invite: sets a password (or uses an existing account's) and signs in. */
export async function acceptInvite(school: string, token: string, input: unknown): Promise<ActionResult<null>> {
  const password = String((input as { password?: unknown })?.password ?? "");
  const hasAccount = Boolean((input as { hasAccount?: unknown })?.hasAccount);
  if (!hasAccount) {
    const parsed = newPasswordSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: CHECK_FIELDS, fieldErrors: fieldErrorsOf(parsed.error) };
  } else if (!password) {
    return { ok: false, error: CHECK_FIELDS, fieldErrors: { password: ["Enter your password"] } };
  }
  return impl.acceptInvite(school, String(token), password);
}
