"use server";

// Results for the school (batch 15; docs/data-contract.md). About `school`: see actions/auth.ts.
import { ratingSchema, ratingSettingsSchema, remarkSchema } from "@brillianda/core/results";
import { fieldErrorsOf } from "@brillianda/core/signup";
import { revalidatePath } from "next/cache";
import * as impl from "../fake/reports";
import type { ActionResult } from "../types";

const done = <T,>(school: string, result: ActionResult<T>) => {
  if (result.ok) revalidatePath(`/s/${school}`, "layout");
  return result;
};

/** Saved as it's typed: no refresh. */
export async function saveRemark(school: string, armId: string, studentId: string, kind: string, input: unknown): Promise<ActionResult<null>> {
  const parsed = remarkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the remark." };
  return impl.saveRemark(school, String(armId), String(studentId), kind === "principal" ? "principal" : "teacher", parsed.data.text);
}

export async function saveRating(school: string, armId: string, studentId: string, input: unknown): Promise<ActionResult<null>> {
  const parsed = ratingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pick a rating from 1 to 5." };
  return impl.saveRating(school, String(armId), String(studentId), parsed.data.trait, parsed.data.value);
}

export async function saveRatingSettings(school: string, input: unknown): Promise<ActionResult<null>> {
  const parsed = ratingSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the traits.", fieldErrors: fieldErrorsOf(parsed.error) };
  return done(school, await impl.saveRatingSettings(school, parsed.data));
}

export async function setPublished(school: string, armId: string, publish: boolean): Promise<ActionResult<null>> {
  return done(school, await impl.setPublished(school, String(armId), publish === true));
}
