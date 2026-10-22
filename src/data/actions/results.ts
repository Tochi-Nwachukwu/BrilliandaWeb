"use server";

// Results (batch 14; docs/data-contract.md). Settings are for owners and admins; a sheet is for its
// subject teacher until marked complete, and for admins always. About `school`: see actions/auth.ts.
import { resultsSettingsSchema, unlockRequestSchema } from "@brillianda/core/results";
import { fieldErrorsOf } from "@brillianda/core/signup";
import { revalidatePath } from "next/cache";
import { LIVE } from "../api/client";
import * as live from "../api/results";
import * as fake from "../fake/results";
import type { ActionResult, SheetStatus } from "../types";

// The API where it has endpoints (DATA_SOURCE=api), else sample data.
const impl = LIVE ? live : fake;

const done = <T,>(school: string, result: ActionResult<T>) => {
  if (result.ok) revalidatePath(`/s/${school}`, "layout");
  return result;
};

export async function saveResultsSettings(school: string, input: unknown): Promise<ActionResult<null>> {
  const parsed = resultsSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.find((i) => i.path.length <= 1)?.message ?? "Please check the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error) };
  return done(school, await impl.saveResultsSettings(school, parsed.data));
}

/** One cell, saved as it's typed. No page refresh: the grid already shows it. */
export async function saveScore(school: string, armId: string, subjectId: string, studentId: string, componentId: string, raw: string): Promise<ActionResult<{ status: SheetStatus }>> {
  return impl.saveScore(school, String(armId), String(subjectId), String(studentId), String(componentId), String(raw ?? ""));
}

export async function setExcluded(school: string, armId: string, subjectId: string, studentId: string, excluded: boolean): Promise<ActionResult<null>> {
  return done(school, await impl.setExcluded(school, String(armId), String(subjectId), String(studentId), excluded === true));
}

export async function markComplete(school: string, armId: string, subjectId: string): Promise<ActionResult<null>> {
  return done(school, await impl.markComplete(school, String(armId), String(subjectId)));
}

export async function requestUnlock(school: string, armId: string, subjectId: string, input: unknown): Promise<ActionResult<null>> {
  const parsed = unlockRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Say what needs changing.", fieldErrors: fieldErrorsOf(parsed.error) };
  return done(school, await impl.requestUnlock(school, String(armId), String(subjectId), parsed.data.reason));
}

export async function resolveUnlock(school: string, armId: string, subjectId: string, approve: boolean): Promise<ActionResult<null>> {
  return done(school, await impl.resolveUnlock(school, String(armId), String(subjectId), approve === true));
}
