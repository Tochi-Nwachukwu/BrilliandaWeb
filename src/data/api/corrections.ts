// Parents' correction requests, on the Brillianda API. Same functions and shapes as
// ../fake/corrections.ts.
import "server-only";
import type { CorrectionRequest } from "@brillianda/core/corrections";
import type { ActionResult, CorrectionsPage } from "../types";
import { api, fail, read } from "./client";

const id = encodeURIComponent;

export async function requestCorrection(subdomain: string, studentId: string, input: CorrectionRequest): Promise<ActionResult<null>> {
  const result = await api(subdomain, `/v1/me/children/${id(studentId)}/corrections`, { method: "POST", body: input });
  return result.ok ? { ok: true, data: null } : fail(result);
}

export async function getCorrections(subdomain: string): Promise<CorrectionsPage | null> {
  return read<CorrectionsPage>(subdomain, "/v1/corrections");
}

export async function countOpenCorrections(subdomain: string): Promise<number> {
  return (await read<{ open: number }>(subdomain, "/v1/corrections/count"))?.open ?? 0;
}

export async function resolveCorrection(subdomain: string, requestId: string, approve: boolean, reason: string | null): Promise<ActionResult<null>> {
  const result = await api(subdomain, `/v1/corrections/${id(requestId)}/resolve`, { method: "POST", body: approve ? { approve } : { approve, reason } });
  return result.ok ? { ok: true, data: null } : fail(result);
}
