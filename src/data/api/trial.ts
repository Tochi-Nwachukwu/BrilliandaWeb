// The website's trial form on the Brillianda API (main site, no session). Same function as
// ../fake/trial.ts. The API accepts a filled honeypot silently, as the fake does.
import "server-only";
import type { ActionResult } from "../types";
import { api, fail } from "./client";

export async function requestTrial(input: Record<string, unknown>): Promise<ActionResult<null>> {
  const text = (key: string) => String(input[key] ?? "").trim();
  const result = await api(null, "/v1/trial-requests", {
    method: "POST",
    body: {
      schoolName: text("schoolName"),
      contactName: text("contactName"),
      role: text("role"),
      email: text("email"),
      phone: text("phone").replace(/[\s-]/g, ""),
      studentCount: Number(text("studentCount").replace(/,/g, "")) || 0,
      ...(text("state") ? { state: text("state") } : {}),
      interests: Array.isArray(input.interests) ? input.interests.map(String) : [],
      ...(text("message") ? { message: text("message") } : {}),
      website: text("website"),
    },
  });
  return result.ok ? { ok: true, data: null } : fail(result);
}
