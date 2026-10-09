"use server";

// Classes and arms (plan: "Quick setup", "Editing after setup"; docs/data-contract.md). Owners and
// admins. About `school`: see actions/auth.ts — the real actions take it from the request's host.
import { armLayoutSchema, armNameSchema, classSetupSchema, DEPARTMENTS, levelNameSchema, newLevelSchema, type Department } from "@brillianda/core/classes";
import { fieldErrorsOf } from "@brillianda/core/signup";
import { revalidatePath } from "next/cache";
import * as impl from "../fake/classes";
import type { ActionResult } from "../types";

const CHECK = "Please check the highlighted fields.";
const done = <T,>(school: string, result: ActionResult<T>) => {
  if (result.ok) revalidatePath(`/s/${school}`, "layout");
  return result;
};

/** The quick setup: every class level and arm in one go. Only while the school has none. */
export async function setupClasses(school: string, input: unknown): Promise<ActionResult<null>> {
  const parsed = classSetupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK, fieldErrors: fieldErrorsOf(parsed.error) };
  return done(school, await impl.setupClasses(school, parsed.data));
}

export async function renameLevel(school: string, levelId: string, input: unknown): Promise<ActionResult<null>> {
  const parsed = levelNameSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK, fieldErrors: fieldErrorsOf(parsed.error) };
  return done(school, await impl.renameLevel(school, String(levelId), parsed.data.name, parsed.data.short));
}

export async function addLevel(school: string, input: unknown): Promise<ActionResult<null>> {
  const parsed = newLevelSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK, fieldErrors: fieldErrorsOf(parsed.error) };
  return done(school, await impl.addLevel(school, parsed.data.name, parsed.data.short, parsed.data.section));
}

/** Refused while any of its arms has students. */
export async function removeLevel(school: string, levelId: string): Promise<ActionResult<null>> {
  return done(school, await impl.removeLevel(school, String(levelId)));
}

export async function setLevelArchived(school: string, levelId: string, archived: boolean): Promise<ActionResult<null>> {
  return done(school, await impl.setLevelArchived(school, String(levelId), Boolean(archived)));
}

/** An existing arm name (`armNameId`), or a new one (`name`, `code`) made for the whole school. */
export async function addArm(school: string, levelId: string, input: unknown): Promise<ActionResult<null>> {
  const value = input as { armNameId?: unknown };
  if (typeof value?.armNameId === "string" && value.armNameId) return done(school, await impl.addArm(school, String(levelId), { armNameId: value.armNameId }));
  const parsed = armNameSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK, fieldErrors: fieldErrorsOf(parsed.error) };
  return done(school, await impl.addArm(school, String(levelId), parsed.data));
}

/** Renames an arm in every class. */
export async function renameArmName(school: string, armNameId: string, input: unknown): Promise<ActionResult<null>> {
  const parsed = armNameSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK, fieldErrors: fieldErrorsOf(parsed.error) };
  return done(school, await impl.renameArmName(school, String(armNameId), parsed.data.name, parsed.data.code));
}

/** Senior arms only: Science, Arts, Commercial, or none. */
export async function setArmDepartment(school: string, armId: string, department: string | null): Promise<ActionResult<null>> {
  const value = department && (DEPARTMENTS as readonly string[]).includes(department) ? (department as Department) : null;
  return done(school, await impl.setArmDepartment(school, String(armId), value));
}

export async function setArmArchived(school: string, armId: string, archived: boolean): Promise<ActionResult<null>> {
  return done(school, await impl.setArmArchived(school, String(armId), Boolean(archived)));
}

/** Refused while it has students, or when it is its class's only arm. */
export async function removeArm(school: string, armId: string): Promise<ActionResult<null>> {
  return done(school, await impl.removeArm(school, String(armId)));
}

/** Every arm at once (Classes › Edit arms): names, order, and which classes have each. */
export async function saveArmLayout(school: string, input: unknown): Promise<ActionResult<{ summary: string }>> {
  const parsed = armLayoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK, fieldErrors: fieldErrorsOf(parsed.error) };
  return done(school, await impl.saveArmLayout(school, parsed.data));
}
