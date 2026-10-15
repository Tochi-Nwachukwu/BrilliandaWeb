// Classes and arms on the Brillianda API. Same functions and shapes as ../fake/classes.ts.
import "server-only";
import type { ArmLayout, ClassSetupInput, Department, Section } from "@brillianda/core/classes";
import type { SchoolLevel } from "@brillianda/core/signup";
import type { ActionResult, ClassStructure } from "../types";
import { api, fail, read } from "./client";

type Structure = Omit<ClassStructure, "levelsOffered"> & { levelsOffered: string[] };

export async function getClassStructure(subdomain: string): Promise<ClassStructure | null> {
  const s = await read<Structure>(subdomain, "/v1/classes");
  return s ? { ...s, levelsOffered: s.levelsOffered.map((l) => l.toUpperCase() as SchoolLevel) } : null;
}

/** Most class changes answer 201 or 204 with nothing the screens need: they reload. */
async function done(subdomain: string, path: string, method: "POST" | "PATCH" | "PUT" | "DELETE", body?: unknown): Promise<ActionResult<null>> {
  const result = await api(subdomain, path, { method, body });
  return result.ok ? { ok: true, data: null } : fail(result);
}

const id = encodeURIComponent;

export async function setupClasses(subdomain: string, input: ClassSetupInput): Promise<ActionResult<null>> {
  return done(subdomain, "/v1/classes/setup", "POST", input);
}

export async function renameLevel(subdomain: string, levelId: string, name: string, short: string): Promise<ActionResult<null>> {
  return done(subdomain, `/v1/class-levels/${id(levelId)}`, "PATCH", { name, short });
}

export async function addLevel(subdomain: string, name: string, short: string, section: Section): Promise<ActionResult<null>> {
  return done(subdomain, "/v1/class-levels", "POST", { name, short, section });
}

export async function removeLevel(subdomain: string, levelId: string): Promise<ActionResult<null>> {
  return done(subdomain, `/v1/class-levels/${id(levelId)}`, "DELETE");
}

export async function setLevelArchived(subdomain: string, levelId: string, archived: boolean): Promise<ActionResult<null>> {
  return done(subdomain, `/v1/class-levels/${id(levelId)}`, "PATCH", { archived });
}

export async function addArm(subdomain: string, levelId: string, arm: { armNameId: string } | { name: string; code: string }): Promise<ActionResult<null>> {
  return done(subdomain, `/v1/class-levels/${id(levelId)}/arms`, "POST", arm);
}

export async function renameArmName(subdomain: string, armNameId: string, name: string, code: string): Promise<ActionResult<null>> {
  return done(subdomain, `/v1/arm-names/${id(armNameId)}`, "PATCH", { name, code });
}

export async function setArmDepartment(subdomain: string, armId: string, department: Department | null): Promise<ActionResult<null>> {
  return done(subdomain, `/v1/arms/${id(armId)}`, "PATCH", { department });
}

export async function setArmArchived(subdomain: string, armId: string, archived: boolean): Promise<ActionResult<null>> {
  return done(subdomain, `/v1/arms/${id(armId)}`, "PATCH", { archived });
}

export async function removeArm(subdomain: string, armId: string): Promise<ActionResult<null>> {
  return done(subdomain, `/v1/arms/${id(armId)}`, "DELETE");
}

export async function saveArmLayout(subdomain: string, layout: ArmLayout): Promise<ActionResult<{ summary: string }>> {
  const result = await api<{ summary: string }>(subdomain, "/v1/arms/layout", { method: "PUT", body: layout });
  return result.ok ? { ok: true, data: result.data } : fail(result);
}
