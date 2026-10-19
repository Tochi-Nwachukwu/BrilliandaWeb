"use server";

// Teachers and the daily register (batch 11; docs/data-contract.md). Assigning teachers is for
// owners and admins; a register is for its arm's form teacher or an admin. About `school`: see
// actions/auth.ts — the real actions take it from the request's host.
import { registerSchema, subjectClassesSchema } from "@brillianda/core/attendance";
import { inviteAdminSchema } from "@brillianda/core/auth";
import { fieldErrorsOf } from "@brillianda/core/signup";
import { revalidatePath } from "next/cache";
import { LIVE } from "../api/client";
import * as live from "../api/teaching";
import * as fake from "../fake/teaching";
import type { ActionResult, SampleEmail } from "../types";

const CHECK = "Please check the highlighted fields.";
// The API where it has endpoints (DATA_SOURCE=api), else sample data.
const impl = LIVE ? live : fake;

const done = <T,>(school: string, result: ActionResult<T>) => {
  if (result.ok) revalidatePath(`/s/${school}`, "layout");
  return result;
};

/** Same fields as inviting an admin: a name and an email. */
export async function inviteTeacher(school: string, input: unknown): Promise<ActionResult<SampleEmail & { resent: boolean }>> {
  const parsed = inviteAdminSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK, fieldErrors: fieldErrorsOf(parsed.error) };
  return done(school, await impl.inviteTeacher(school, parsed.data.fullName, parsed.data.email));
}

export async function removeTeacher(school: string, id: string): Promise<ActionResult<null>> {
  return done(school, await impl.removeTeacher(school, String(id)));
}

export async function setFormTeacher(school: string, armId: string, userId: string | null): Promise<ActionResult<null>> {
  return done(school, await impl.setFormTeacher(school, String(armId), userId ? String(userId) : null));
}

export async function setSubjectClasses(school: string, userId: string, input: unknown): Promise<ActionResult<null>> {
  const parsed = subjectClassesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pick the classes again." };
  return done(school, await impl.setSubjectClasses(school, String(userId), parsed.data));
}

export async function saveRegister(school: string, armId: string, input: unknown): Promise<ActionResult<{ present: number; absent: number }>> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Mark every student, then save.", fieldErrors: fieldErrorsOf(parsed.error) };
  return done(school, await impl.saveRegister(school, String(armId), parsed.data));
}
