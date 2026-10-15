"use server";

// Birthday messages (batch 19; docs/data-contract.md).
import { birthdaySettingsSchema } from "@brillianda/core/birthdays";
import { fieldErrorsOf } from "@brillianda/core/signup";
import * as impl from "../fake/birthdays";
import type { ActionResult } from "../types";

/** On or off, and the school's message (with {name}, {age} and {school}). Owners and admins. */
export async function saveBirthdaySettings(school: string, input: unknown): Promise<ActionResult<null>> {
  const parsed = birthdaySettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the message.", fieldErrors: fieldErrorsOf(parsed.error) };
  return impl.saveBirthdaySettings(school, parsed.data);
}
