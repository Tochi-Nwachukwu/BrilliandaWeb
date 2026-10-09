"use server";

// The school's team (docs/data-contract.md). Only the owner invites and removes admins (plan:
// roles). About `school`: see actions/auth.ts — the real actions take it from the request's host.
import { inviteAdminSchema } from "@brillianda/core/auth";
import { fieldErrorsOf } from "@brillianda/core/signup";
import { revalidatePath } from "next/cache";
import * as impl from "../fake/auth";
import type { ActionResult, SampleEmail } from "../types";

export async function inviteAdmin(school: string, input: unknown): Promise<ActionResult<SampleEmail & { resent: boolean }>> {
  const parsed = inviteAdminSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error) };
  const result = await impl.inviteAdmin(school, parsed.data.fullName, parsed.data.email);
  if (result.ok) revalidatePath(`/s/${school}/more/admins`);
  return result;
}

export async function cancelInvite(school: string, inviteId: string): Promise<ActionResult<null>> {
  const result = await impl.cancelInvite(school, String(inviteId));
  if (result.ok) revalidatePath(`/s/${school}/more/admins`);
  return result;
}

export async function removeAdmin(school: string, userId: string): Promise<ActionResult<null>> {
  const result = await impl.removeAdmin(school, String(userId));
  if (result.ok) revalidatePath(`/s/${school}/more/admins`);
  return result;
}
