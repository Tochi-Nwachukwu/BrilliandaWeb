"use server";

// The Brillianda team console (batch 13; docs/data-contract.md). Team accounts only.
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { signInSchema } from "@brillianda/core/auth";
import { fieldErrorsOf } from "@brillianda/core/signup";
import { LIVE } from "../api/client";
import * as live from "../api/console";
import * as fake from "../fake/console";
import type { ActionResult, TrialStatus } from "../types";

// The API where it has endpoints (DATA_SOURCE=api), else sample data.
const impl = LIVE ? live : fake;

const STATUSES: TrialStatus[] = ["new", "contacted", "converted", "declined"];

export async function teamSignIn(input: unknown): Promise<ActionResult<null>> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error) };
  return impl.teamSignIn(parsed.data.email, parsed.data.password);
}

export async function teamSignOut(): Promise<void> {
  await impl.teamSignOut();
  redirect("/console/login");
}

/** Pausing or reactivating a school needs a reason, which the school sees in its history. */
export async function setSchoolStatus(subdomain: string, status: "active" | "suspended", reason: unknown): Promise<ActionResult<null>> {
  const text = String(reason ?? "").trim();
  if (text.length < 3) return { ok: false, error: "Give a reason. The school sees it.", fieldErrors: { reason: ["Give a reason"] } };
  if (text.length > 200) return { ok: false, error: "Keep the reason under 200 characters.", fieldErrors: { reason: ["Use at most 200 characters"] } };
  const result = await impl.setSchoolStatus(String(subdomain), status === "suspended" ? "suspended" : "active", text);
  if (result.ok) revalidatePath("/console", "layout");
  return result;
}

export async function setTrialStatus(id: string, status: string, note: unknown): Promise<ActionResult<null>> {
  if (!STATUSES.includes(status as TrialStatus)) return { ok: false, error: "Pick a status." };
  const result = await impl.setTrialStatus(String(id), status as TrialStatus, String(note ?? "").trim().slice(0, 300));
  if (result.ok) revalidatePath("/console", "layout");
  return result;
}
