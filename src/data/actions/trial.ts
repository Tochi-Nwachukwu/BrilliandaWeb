"use server";

// A school asking for a trial from the marketing site (docs/data-contract.md).
import { validateTrialRequest } from "@brillianda/core/trial";
import * as impl from "../fake/trial";
import type { ActionResult } from "../types";

/**
 * Records a trial request. The real action must check the input again here (same rules as the
 * page) and rate-limit by connection; a filled-in honeypot (`website`) is accepted silently and
 * dropped, so bots learn nothing.
 */
export async function requestTrial(input: Record<string, unknown>): Promise<ActionResult<null>> {
  const errors = validateTrialRequest(input);
  if (Object.keys(errors).length) {
    const fieldErrors = Object.fromEntries(Object.entries(errors).map(([field, message]) => [field, [message!]]));
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
  }
  return impl.requestTrial(input);
}
