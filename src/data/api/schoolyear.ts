// Closing a term, on the Brillianda API. Same functions and shapes as ../fake/schoolyear.ts.
// Promotion isn't on the API yet (docs/backend-requirements.md).
import "server-only";
import type { ActionResult, TermStatusData } from "../types";
import { api, fail, read } from "./client";

export async function getTermStatus(subdomain: string): Promise<TermStatusData | null> {
  return read<TermStatusData>(subdomain, "/v1/terms/status");
}

export async function closeTerm(subdomain: string, input: { closeUnpublished: boolean; nextStartsOn?: string; nextEndsOn?: string }): Promise<ActionResult<{ closed: string; next: string | null }>> {
  const result = await api<{ closed: string; next: string | null }>(subdomain, "/v1/terms/close", { method: "POST", body: input });
  return result.ok ? { ok: true, data: result.data } : fail(result);
}
