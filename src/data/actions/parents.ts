"use server";

// Parents (batch 12; docs/data-contract.md). Owners and admins invite guardians to the parent app.
// About `school`: see actions/auth.ts — the real actions take it from the request's host.
import { revalidatePath } from "next/cache";
import * as impl from "../fake/parents";
import type { ActionResult, SampleEmail } from "../types";

const done = <T,>(school: string, result: ActionResult<T>) => {
  if (result.ok) revalidatePath(`/s/${school}`, "layout");
  return result;
};

export async function inviteParent(school: string, guardianId: string): Promise<ActionResult<SampleEmail>> {
  return done(school, await impl.inviteParent(school, String(guardianId)));
}

export async function inviteAllParents(school: string): Promise<ActionResult<SampleEmail & { invited: number; withoutEmail: number }>> {
  return done(school, await impl.inviteAllParents(school));
}

export async function removeParentAccess(school: string, guardianId: string): Promise<ActionResult<null>> {
  return done(school, await impl.removeParentAccess(school, String(guardianId)));
}
