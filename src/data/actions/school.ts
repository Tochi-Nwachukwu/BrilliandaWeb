"use server";

// The school's name, colour and logo (plan: "School branding"; docs/data-contract.md). Owner only.
// About `school`: see actions/auth.ts — the real actions take it from the request's host.
import { brandingSchema } from "@brillianda/core/branding";
import { fieldErrorsOf } from "@brillianda/core/signup";
import { revalidatePath } from "next/cache";
import * as impl from "../fake/school";
import type { ActionResult, SchoolSummary } from "../types";

const done = <T,>(school: string, result: ActionResult<T>) => {
  if (result.ok) revalidatePath(`/s/${school}`, "layout");
  return result;
};

export async function updateBranding(school: string, input: unknown): Promise<ActionResult<SchoolSummary>> {
  const parsed = brandingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error) };
  return done(school, await impl.updateBranding(school, parsed.data));
}

/** `form` carries one file, `logo`, already shrunk and re-encoded by the browser. */
export async function uploadLogo(school: string, form: FormData): Promise<ActionResult<SchoolSummary>> {
  const file = form.get("logo");
  if (!(file instanceof File)) return { ok: false, error: "Pick an image first." };
  return done(school, await impl.setLogo(school, file));
}

export async function removeLogo(school: string): Promise<ActionResult<SchoolSummary>> {
  return done(school, await impl.removeLogo(school));
}
