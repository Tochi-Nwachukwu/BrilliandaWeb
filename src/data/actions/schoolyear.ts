"use server";

// Running the school year (group 3; docs/data-contract.md). Owners and admins.
import { revalidatePath } from "next/cache";
import { decisionSchema, passMarkSchema } from "@brillianda/core/promotion";
import * as promotion from "../fake/promotion";
import { LIVE } from "../api/client";
import * as live from "../api/schoolyear";
import * as fake from "../fake/schoolyear";
import type { ActionResult } from "../types";

// The API where it has endpoints (DATA_SOURCE=api), else sample data. Promotion isn’t on the API yet.
const impl = LIVE ? live : fake;

export async function closeTerm(school: string, input: unknown): Promise<ActionResult<{ closed: string; next: string | null }>> {
  const value = (input ?? {}) as { closeUnpublished?: unknown; nextStartsOn?: unknown; nextEndsOn?: unknown };
  const result = await impl.closeTerm(school, {
    closeUnpublished: value.closeUnpublished === true,
    nextStartsOn: typeof value.nextStartsOn === "string" && value.nextStartsOn ? value.nextStartsOn : undefined,
    nextEndsOn: typeof value.nextEndsOn === "string" && value.nextEndsOn ? value.nextEndsOn : undefined,
  });
  if (result.ok) revalidatePath(`/s/${school}`, "layout");
  return result;
}

export async function setPassMark(school: string, input: unknown): Promise<ActionResult<null>> {
  const parsed = passMarkSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Give a pass mark from 0 to 100." };
  const result = await promotion.setPassMark(school, parsed.data.passMark);
  if (result.ok) revalidatePath(`/s/${school}`, "layout");
  return result;
}

/** One student's decision. No page refresh: the screen already shows it. */
export async function setDecision(school: string, studentId: string, input: unknown): Promise<ActionResult<null>> {
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pick moves up, repeats or graduates." };
  return promotion.setDecision(school, String(studentId), parsed.data.decision, parsed.data.reason || null);
}

export async function completePromotion(school: string, input: unknown): Promise<ActionResult<{ promoted: number; repeating: number; graduated: number; session: string }>> {
  const value = (input ?? {}) as { closeUnpublished?: unknown; startsOn?: unknown; endsOn?: unknown };
  const day = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  const result = await promotion.completePromotion(school, { closeUnpublished: value.closeUnpublished === true, startsOn: day(value.startsOn), endsOn: day(value.endsOn) });
  if (result.ok) revalidatePath(`/s/${school}`, "layout");
  return result;
}
