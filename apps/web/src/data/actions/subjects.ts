"use server";

// Subjects (plan: "How a school sets subjects"; docs/data-contract.md). Owners and admins. About
// `school`: see actions/auth.ts — the real actions take it from the request's host.
import { addSubjectsSchema, DEPARTMENTS, fieldErrorsOf, subjectNameSchema, type Department } from "@brillianda/core";
import { revalidatePath } from "next/cache";
import * as impl from "../fake/subjects";
import type { ActionResult } from "../types";

const done = <T,>(school: string, result: ActionResult<T>) => {
  if (result.ok) revalidatePath(`/s/${school}`, "layout");
  return result;
};

/** Catalogue subjects attach to their default levels; the school's own attach nowhere until set. */
export async function addSubjects(school: string, input: unknown): Promise<ActionResult<{ added: number }>> {
  const parsed = addSubjectsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the subjects.", fieldErrors: fieldErrorsOf(parsed.error) };
  return done(school, await impl.addSubjects(school, parsed.data.catalogueIds, parsed.data.custom));
}

/** Renaming keeps the subject linked to its catalogue entry. */
export async function renameSubject(school: string, subjectId: string, input: unknown): Promise<ActionResult<null>> {
  const parsed = subjectNameSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrorsOf(parsed.error) };
  return done(school, await impl.renameSubject(school, String(subjectId), parsed.data.name, parsed.data.code));
}

export async function removeSubject(school: string, subjectId: string): Promise<ActionResult<null>> {
  return done(school, await impl.removeSubject(school, String(subjectId)));
}

/** "compulsory", "elective", or null to take the subject off that class level. */
export async function setSubjectLink(school: string, subjectId: string, levelId: string, kind: string | null): Promise<ActionResult<null>> {
  const value = kind === "compulsory" || kind === "elective" ? kind : null;
  return done(school, await impl.setSubjectLink(school, String(subjectId), String(levelId), value));
}

/** The department of a subject's senior electives, or none. */
export async function setSubjectDepartment(school: string, subjectId: string, department: string | null): Promise<ActionResult<null>> {
  const value = department && (DEPARTMENTS as readonly string[]).includes(department) ? (department as Department) : null;
  return done(school, await impl.setSubjectDepartment(school, String(subjectId), value));
}
