"use server";

// The four signup screens' saves (plan: "Creating a school"; docs/data-contract.md). Each one
// checks its input with the same schema the page used, then hands over to the implementation.
import {
  fieldErrorsOf,
  ownerAccountSchema,
  schoolAddressSchema,
  schoolDetailsSchema,
  verifyCodeSchema,
} from "@brillianda/core";
import * as impl from "../fake/signup";
import type { ActionResult, SignupDraft, SubdomainCheck } from "../types";

const CHECK_FIELDS = "Please check the highlighted fields.";

/** Screen 1: school name, levels, state, phone and when the first session starts. */
export async function saveSchoolDetails(input: unknown): Promise<ActionResult<SignupDraft>> {
  const parsed = schoolDetailsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK_FIELDS, fieldErrors: fieldErrorsOf(parsed.error) };
  return impl.saveSchoolDetails(parsed.data);
}

/** Screen 2: the owner's account. Sends the 6-digit code. The real one also checks the bot test. */
export async function saveOwnerAccount(input: unknown): Promise<ActionResult<SignupDraft>> {
  const parsed = ownerAccountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK_FIELDS, fieldErrors: fieldErrorsOf(parsed.error) };
  return impl.saveOwnerAccount(parsed.data);
}

/** Screen 3: a new code, no sooner than 60 seconds after the last. */
export async function resendSignupCode(): Promise<ActionResult<SignupDraft>> {
  return impl.resendSignupCode();
}

/** Screen 3: the code from the email. Codes last 10 minutes. */
export async function verifySignupEmail(input: unknown): Promise<ActionResult<SignupDraft>> {
  const parsed = verifyCodeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK_FIELDS, fieldErrors: fieldErrorsOf(parsed.error) };
  return impl.verifySignupEmail(parsed.data.code);
}

/**
 * Screen 4, as the owner types: is this address free, and if not, why and what else to try.
 * The real check is debounced on the page and rate limited on the server.
 */
export async function checkSubdomain(name: string, state?: string): Promise<SubdomainCheck> {
  return impl.checkSubdomain(String(name), state ? String(state) : undefined);
}

/** Screen 4: create the school, make the signer its owner and sign them in on the new address. */
export async function createSchool(input: unknown): Promise<ActionResult<{ subdomain: string; url: string }>> {
  const parsed = schoolAddressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK_FIELDS, fieldErrors: fieldErrorsOf(parsed.error) };
  return impl.createSchool(parsed.data.subdomain);
}
