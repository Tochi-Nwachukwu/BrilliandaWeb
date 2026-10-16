"use server";

// Student accounts (batch 23; docs/data-contract.md). Owners and admins.
import { emailOnlySchema } from "@brillianda/core/auth";
import { fieldErrorsOf } from "@brillianda/core/signup";
import * as impl from "../fake/learners";
import type { ActionResult, SampleEmail } from "../types";

/** Invites a student to the student portal by email (theirs, or one the school gives them). */
export async function inviteStudent(school: string, studentId: string, input: unknown): Promise<ActionResult<SampleEmail>> {
  const parsed = emailOnlySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the email.", fieldErrors: fieldErrorsOf(parsed.error) };
  return impl.inviteStudent(String(school), String(studentId), parsed.data.email);
}

/** Ends a student's portal access (or cancels the invite). Their record stays. */
export async function removeStudentAccess(school: string, studentId: string): Promise<ActionResult<null>> {
  return impl.removeStudentAccess(String(school), String(studentId));
}
