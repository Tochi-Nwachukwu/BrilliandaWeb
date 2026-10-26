// Promotion at the end of the session, on the Brillianda API. Same functions and shapes as
// ../fake/promotion.ts.
import "server-only";
import type { Decision } from "@brillianda/core/promotion";
import type { ActionResult, PromotionPlan } from "../types";
import { api, fail, read } from "./client";

export async function getPromotionPlan(subdomain: string): Promise<PromotionPlan | null> {
  return read<PromotionPlan>(subdomain, "/v1/promotion");
}

export async function setPassMark(subdomain: string, passMark: number): Promise<ActionResult<null>> {
  const result = await api(subdomain, "/v1/promotion/pass-mark", { method: "PUT", body: { passMark } });
  return result.ok ? { ok: true, data: null } : fail(result);
}

export async function setDecision(subdomain: string, studentId: string, decision: Decision, reason: string | null): Promise<ActionResult<null>> {
  const result = await api(subdomain, `/v1/promotion/students/${encodeURIComponent(studentId)}`, { method: "PUT", body: { decision, reason } });
  return result.ok ? { ok: true, data: null } : fail(result);
}

export async function completePromotion(subdomain: string, input: { closeUnpublished: boolean; startsOn?: string; endsOn?: string }): Promise<ActionResult<{ promoted: number; repeating: number; graduated: number; session: string }>> {
  const result = await api<{ promoted: number; repeating: number; graduated: number; session: string }>(subdomain, "/v1/promotion/complete", { method: "POST", body: input });
  return result.ok ? { ok: true, data: result.data } : fail(result);
}
