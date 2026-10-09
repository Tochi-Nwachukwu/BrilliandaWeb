"use server";

// Students (plan: "Adding one student", "Managing students"; docs/data-contract.md). Owners and
// admins. About `school`: see actions/auth.ts — the real actions take it from the request's host.
import { fieldErrorsOf } from "@brillianda/core/signup";
import { moveStudentsSchema, statusChangeSchema, studentSchema } from "@brillianda/core/students";
import { revalidatePath } from "next/cache";
import * as impl from "../fake/students";
import type { ActionResult, AdmissionSettings, GuardianMatch } from "../types";

const CHECK = "Please check the highlighted fields.";
const done = <T,>(school: string, result: ActionResult<T>) => {
  if (result.ok) revalidatePath(`/s/${school}`, "layout");
  return result;
};

/** A blank admission number gets the next one from the school's counter. */
export async function addStudent(school: string, input: unknown): Promise<ActionResult<{ id: string; admissionNo: string; fullName: string }>> {
  const parsed = studentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK, fieldErrors: fieldErrorsOf(parsed.error) };
  return done(school, await impl.addStudent(school, parsed.data));
}

/** A new class is recorded in the student's class history. */
export async function updateStudent(school: string, studentId: string, input: unknown): Promise<ActionResult<null>> {
  const parsed = studentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK, fieldErrors: fieldErrorsOf(parsed.error) };
  return done(school, await impl.updateStudent(school, String(studentId), parsed.data));
}

export async function moveStudents(school: string, input: unknown): Promise<ActionResult<{ moved: number }>> {
  const parsed = moveStudentsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pick the students and a class.", fieldErrors: fieldErrorsOf(parsed.error) };
  return done(school, await impl.moveStudents(school, parsed.data.studentIds, parsed.data.armId));
}

/** Active, suspended, withdrawn, transferred or graduated; the record always stays. */
export async function setStudentsStatus(school: string, input: unknown): Promise<ActionResult<{ changed: number }>> {
  const parsed = statusChangeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pick the students and a status.", fieldErrors: fieldErrorsOf(parsed.error) };
  return done(school, await impl.setStudentsStatus(school, parsed.data.studentIds, parsed.data.status));
}

/** Only for students added by mistake. A soft delete. */
export async function deleteStudent(school: string, studentId: string): Promise<ActionResult<null>> {
  return done(school, await impl.deleteStudent(school, String(studentId)));
}

/** As the guardian phone is typed: a guardian already on file with that number, if any. */
export async function findGuardian(school: string, phone: string): Promise<GuardianMatch | null> {
  return impl.findGuardian(school, String(phone));
}

/** The admission number pattern ({YEAR} and {NUMBER}) and how many digits the number has. */
export async function setAdmissionFormat(school: string, input: unknown): Promise<ActionResult<AdmissionSettings>> {
  const value = input as { pattern?: unknown; digits?: unknown };
  return done(school, await impl.setAdmissionFormat(school, String(value?.pattern ?? ""), Number(value?.digits ?? 4)));
}
