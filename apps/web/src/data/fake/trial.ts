// FAKE: trial requests kept in memory. The backend replaces this with a stored request and an
// email to the team.
import "server-only";
import type { ActionResult } from "../types";
import { store } from "./store";

export async function requestTrial(input: Record<string, unknown>): Promise<ActionResult<null>> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  if (String(input.website ?? "")) return { ok: true, data: null };
  store.trialRequests.push({ ...input, at: new Date().toISOString() });
  return { ok: true, data: null };
}
