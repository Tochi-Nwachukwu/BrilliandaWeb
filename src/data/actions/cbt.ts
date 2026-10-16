"use server";

// CBT tests (batch 25; docs/data-contract.md).
import { testSettingsSchema } from "@brillianda/core/cbt";
import { fieldErrorsOf } from "@brillianda/core/signup";
import * as impl from "../fake/cbt";
import type { ActionResult } from "../types";
import type { Response } from "@brillianda/core/questions";

/** Saves a test as a draft, or publishes it (`publish`). Teachers for their classes; admins for any. */
export async function saveTest(school: string, input: unknown): Promise<ActionResult<{ id: string }>> {
  const raw = input as { id?: unknown; subjectId?: unknown; levelId?: unknown; publish?: unknown; settings?: unknown };
  const parsed = testSettingsSchema.safeParse(raw?.settings);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the test.", fieldErrors: fieldErrorsOf(parsed.error) };
  return impl.saveTest(String(school), raw.id ? String(raw.id) : null, String(raw.subjectId ?? ""), String(raw.levelId ?? ""), parsed.data, raw.publish === true);
}

export async function deleteTest(school: string, id: string): Promise<ActionResult<null>> {
  return impl.deleteTest(String(school), String(id));
}

export async function markTheory(school: string, testId: string, input: unknown): Promise<ActionResult<null>> {
  const raw = input as { attemptId?: unknown; index?: unknown; marks?: unknown };
  const marks = Number(raw?.marks);
  if (!Number.isFinite(marks)) return { ok: false, error: "Enter a number of marks." };
  return impl.markTheory(String(school), String(testId), String(raw.attemptId ?? ""), Number(raw.index), marks);
}

export async function sendScores(school: string, testId: string): Promise<ActionResult<{ sent: number; skipped: number; lockedClasses: string[] }>> {
  return impl.sendScores(String(school), String(testId));
}

// ——— Students ———

export async function startTest(school: string, testId: string, input: unknown): Promise<ActionResult<null>> {
  return impl.startTest(String(school), String(testId), String((input as { code?: unknown })?.code ?? ""));
}

/** Checks an answer's shape: an option, true or false, or text up to 5,000 characters. */
function responseOf(input: unknown): Response | null | undefined {
  if (input === null) return null;
  const r = input as Record<string, unknown>;
  if (typeof r?.option === "number" && Number.isInteger(r.option) && r.option >= 0) return { option: r.option };
  if (typeof r?.value === "boolean") return { value: r.value };
  if (typeof r?.text === "string") return r.text.trim() ? { text: r.text.slice(0, 5000) } : null;
  return undefined;
}

export async function saveAnswer(school: string, testId: string, input: unknown): Promise<ActionResult<null>> {
  const raw = input as { index?: unknown; response?: unknown };
  const response = responseOf(raw?.response);
  if (response === undefined || !Number.isInteger(raw?.index)) return { ok: false, error: "That answer couldn’t be saved." };
  return impl.saveAnswer(String(school), String(testId), Number(raw.index), response);
}

export async function noteLeftPage(school: string, testId: string): Promise<void> {
  await impl.noteLeftPage(String(school), String(testId));
}

export async function submitTest(school: string, testId: string): Promise<ActionResult<{ score: { total: number; max: number; complete: boolean } | null }>> {
  return impl.submitTest(String(school), String(testId));
}
