// FAKE: trial requests kept in memory. The backend replaces this with a stored request and an
// email to the team.
import "server-only";
import type { ActionResult } from "../types";
import { store } from "./store";

export async function requestTrial(input: Record<string, unknown>): Promise<ActionResult<null>> {
  await new Promise((resolve) => setTimeout(resolve, 500));
  if (String(input.website ?? "")) return { ok: true, data: null };
  const text = (key: string) => String(input[key] ?? "").trim();
  store.trialRequests.push({
    id: crypto.randomUUID(),
    at: Date.now(),
    schoolName: text("schoolName"),
    contactName: text("contactName"),
    role: text("role"),
    email: text("email"),
    phone: text("phone"),
    studentCount: Number(input.studentCount) || 0,
    state: text("state") || undefined,
    interests: Array.isArray(input.interests) ? input.interests.map(String) : [],
    message: text("message") || undefined,
    status: "new",
  });
  return { ok: true, data: null };
}
