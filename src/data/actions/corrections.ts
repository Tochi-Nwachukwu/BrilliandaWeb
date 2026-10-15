"use server";

// Parents' correction requests (batch 21; docs/data-contract.md).
import { correctionRequestSchema, declineSchema } from "@brillianda/core/corrections";
import { fieldErrorsOf } from "@brillianda/core/signup";
import * as impl from "../fake/corrections";
import type { ActionResult } from "../types";

const CHECK_FIELDS = "Please check the highlighted fields.";

/** A parent asks the school to correct their own child's details. */
export async function requestCorrection(school: string, studentId: string, input: unknown): Promise<ActionResult<null>> {
  const parsed = correctionRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK_FIELDS, fieldErrors: fieldErrorsOf(parsed.error) };
  return impl.requestCorrection(String(school), String(studentId), parsed.data);
}

/** Approve (the record changes) or decline with a reason the parent sees. Owners and admins. */
export async function resolveCorrection(school: string, id: string, input: unknown): Promise<ActionResult<null>> {
  const approve = Boolean((input as { approve?: unknown })?.approve);
  if (approve) return impl.resolveCorrection(String(school), String(id), true, null);
  const parsed = declineSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK_FIELDS, fieldErrors: fieldErrorsOf(parsed.error) };
  return impl.resolveCorrection(String(school), String(id), false, parsed.data.reason);
}
