"use server";

// Home's checklist and the school's calendar (docs/data-contract.md). About `school`: see
// actions/auth.ts — the real actions take it from the request's host.
import { fieldErrorsOf, sessionSchema } from "@brillianda/core";
import { revalidatePath } from "next/cache";
import * as impl from "../fake/home";
import type { ActionResult, SessionSetup } from "../types";

/** Saves the session and its terms (two or three, in order, names editable). Owners and admins. */
export async function saveSession(school: string, input: unknown): Promise<ActionResult<SessionSetup>> {
  const parsed = sessionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the highlighted dates.", fieldErrors: fieldErrorsOf(parsed.error) };
  const result = await impl.saveSession(school, parsed.data);
  if (result.ok) revalidatePath(`/s/${school}`, "layout");
  return result;
}

/** Hides or shows the setup checklist on Home. */
export async function hideChecklist(school: string, hidden: boolean): Promise<ActionResult<null>> {
  const result = await impl.hideChecklist(school, Boolean(hidden));
  if (result.ok) revalidatePath(`/s/${school}`);
  return result;
}
