// FAKE: classes and arms on sample data. The backend replaces this with the class_levels,
// arm_names and arms tables (plan: "The class ladder", "Arms", "Editing after setup").
import "server-only";
import { DEPARTMENT_LABEL, SECTION_LABEL, type ClassSetupInput, type Department, type Section } from "@brillianda/core";
import type { ActionResult, ClassStructure } from "../types";
import { requireMember } from "./auth";
import { recordChange } from "./changes";
import { store } from "./store";

const pause = () => new Promise((resolve) => setTimeout(resolve, 300));
const SECTION_ORDER: Section[] = ["preschool", "primary", "junior", "senior"];

const studentsIn = (armId: string) => store.students.filter((s) => s.armId === armId).length;

export async function getClassStructure(subdomain: string): Promise<ClassStructure | null> {
  if (!(await requireMember(subdomain))) return null;
  return {
    levelsOffered: store.profiles.get(subdomain)?.levelsOffered ?? ["SECONDARY"],
    levels: store.levels
      .filter((l) => l.subdomain === subdomain)
      .sort((a, b) => a.position - b.position)
      .map(({ id, key, name, short, section, position, archived }) => ({ id, key, name, short, section, position, archived })),
    armNames: store.armNames
      .filter((a) => a.subdomain === subdomain)
      .sort((a, b) => a.position - b.position)
      .map(({ id, name, code }) => ({ id, name, code })),
    arms: store.arms
      .filter((a) => a.subdomain === subdomain)
      .map(({ id, levelId, armNameId, department, archived }) => ({ id, levelId, armNameId, department, archived, studentCount: studentsIn(id) })),
  };
}

type Who = NonNullable<Awaited<ReturnType<typeof requireMember>>>;
async function member(subdomain: string): Promise<Who | { error: string }> {
  return (await requireMember(subdomain)) ?? { error: "Sign in first." };
}
const fail = (error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> => ({ ok: false, error, fieldErrors });

export async function setupClasses(subdomain: string, input: ClassSetupInput): Promise<ActionResult<null>> {
  await pause();
  const who = await member(subdomain);
  if ("error" in who) return fail(who.error);
  if (store.levels.some((l) => l.subdomain === subdomain)) return fail("Your classes are already set up. Change them here instead.");

  const levelIds = input.levels.map(() => crypto.randomUUID());
  const nameIds = input.arms.map(() => crypto.randomUUID());
  input.levels.forEach((level, i) => store.levels.push({ id: levelIds[i]!, subdomain, key: level.key, name: level.name, short: level.short, section: level.section, position: i, archived: false }));
  input.arms.forEach((arm, i) => store.armNames.push({ id: nameIds[i]!, subdomain, name: arm.name, code: arm.code.toUpperCase(), position: i }));
  input.armsByLevel.forEach((list, i) =>
    list.forEach((index) => store.arms.push({ id: crypto.randomUUID(), subdomain, levelId: levelIds[i]!, armNameId: nameIds[index]!, department: null, archived: false })),
  );
  const count = input.armsByLevel.reduce((n, list) => n + list.length, 0);
  recordChange(subdomain, who.fullName, `Set up ${count} ${count === 1 ? "class" : "classes"}, ${input.levels[0]!.name} to ${input.levels.at(-1)!.name}`);
  return { ok: true, data: null };
}

const levelOf = (subdomain: string, id: string) => store.levels.find((l) => l.subdomain === subdomain && l.id === id);
const armOf = (subdomain: string, id: string) => store.arms.find((a) => a.subdomain === subdomain && a.id === id);
const nameOf = (subdomain: string, id: string) => store.armNames.find((a) => a.subdomain === subdomain && a.id === id);
const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

export async function renameLevel(subdomain: string, levelId: string, name: string, short: string): Promise<ActionResult<null>> {
  await pause();
  const who = await member(subdomain);
  if ("error" in who) return fail(who.error);
  const level = levelOf(subdomain, levelId);
  if (!level) return fail("That class isn’t here any more.");
  if (store.levels.some((l) => l.subdomain === subdomain && l.id !== levelId && sameName(l.name, name))) return fail("Two classes can’t share a name.", { name: ["Another class has this name"] });
  const before = level.name;
  Object.assign(level, { name, short });
  if (before !== name) recordChange(subdomain, who.fullName, `Renamed ${before} to ${name}`);
  return { ok: true, data: null };
}

/** A class added after setup. It goes at the end of its section and starts with the school's first arm. */
export async function addLevel(subdomain: string, name: string, short: string, section: Section): Promise<ActionResult<null>> {
  await pause();
  const who = await member(subdomain);
  if ("error" in who) return fail(who.error);
  if (store.levels.some((l) => l.subdomain === subdomain && sameName(l.name, name))) return fail("Two classes can’t share a name.", { name: ["Another class has this name"] });
  const firstArm = store.armNames.filter((a) => a.subdomain === subdomain).sort((a, b) => a.position - b.position)[0];
  if (!firstArm) return fail("Set up your classes first.");

  const levels = store.levels.filter((l) => l.subdomain === subdomain).sort((a, b) => a.position - b.position);
  const rank = SECTION_ORDER.indexOf(section);
  const after = levels.filter((l) => SECTION_ORDER.indexOf(l.section) <= rank).at(-1);
  const position = after ? after.position + 1 : 0;
  for (const level of levels) if (level.position >= position) level.position += 1;
  const id = crypto.randomUUID();
  store.levels.push({ id, subdomain, key: null, name, short, section, position, archived: false });
  store.arms.push({ id: crypto.randomUUID(), subdomain, levelId: id, armNameId: firstArm.id, department: null, archived: false });
  recordChange(subdomain, who.fullName, `Added ${name} to ${SECTION_LABEL[section].toLowerCase()}`);
  return { ok: true, data: null };
}

export async function removeLevel(subdomain: string, levelId: string): Promise<ActionResult<null>> {
  await pause();
  const who = await member(subdomain);
  if ("error" in who) return fail(who.error);
  const level = levelOf(subdomain, levelId);
  if (!level) return fail("That class isn’t here any more.");
  const arms = store.arms.filter((a) => a.levelId === levelId);
  const students = arms.reduce((n, a) => n + studentsIn(a.id), 0);
  if (students) return fail(`${level.name} has ${students} ${students === 1 ? "student" : "students"}. Move them first, or archive the class instead.`);
  store.arms = store.arms.filter((a) => a.levelId !== levelId);
  store.levels = store.levels.filter((l) => l.id !== levelId);
  recordChange(subdomain, who.fullName, `Removed ${level.name}`);
  return { ok: true, data: null };
}

export async function setLevelArchived(subdomain: string, levelId: string, archived: boolean): Promise<ActionResult<null>> {
  await pause();
  const who = await member(subdomain);
  if ("error" in who) return fail(who.error);
  const level = levelOf(subdomain, levelId);
  if (!level) return fail("That class isn’t here any more.");
  level.archived = archived;
  recordChange(subdomain, who.fullName, `${archived ? "Archived" : "Brought back"} ${level.name}`);
  return { ok: true, data: null };
}

/** Adds an arm to one class: an existing arm name, or a new one made for the whole school. */
export async function addArm(subdomain: string, levelId: string, arm: { armNameId: string } | { name: string; code: string }): Promise<ActionResult<null>> {
  await pause();
  const who = await member(subdomain);
  if ("error" in who) return fail(who.error);
  const level = levelOf(subdomain, levelId);
  if (!level) return fail("That class isn’t here any more.");
  let armName = "armNameId" in arm ? nameOf(subdomain, arm.armNameId) : undefined;
  if (!("armNameId" in arm)) {
    const names = store.armNames.filter((a) => a.subdomain === subdomain);
    if (names.some((a) => sameName(a.name, arm.name))) return fail("You already have an arm with this name. Pick it from the list.", { name: ["Already one of your arms"] });
    if (names.some((a) => a.code === arm.code)) return fail("Another arm uses this code.", { code: ["Another arm uses this code"] });
    armName = { id: crypto.randomUUID(), subdomain, name: arm.name, code: arm.code, position: names.length };
    store.armNames.push(armName);
  }
  if (!armName) return fail("That arm isn’t here any more.");
  if (store.arms.some((a) => a.levelId === levelId && a.armNameId === armName!.id)) return fail(`${level.name} already has ${armName.name}.`);
  store.arms.push({ id: crypto.randomUUID(), subdomain, levelId, armNameId: armName.id, department: null, archived: false });
  recordChange(subdomain, who.fullName, `Added ${level.name} ${armName.name}`);
  return { ok: true, data: null };
}

/** Renaming an arm renames it in every class (plan: arm names live once per school). */
export async function renameArmName(subdomain: string, armNameId: string, name: string, code: string): Promise<ActionResult<null>> {
  await pause();
  const who = await member(subdomain);
  if ("error" in who) return fail(who.error);
  const armName = nameOf(subdomain, armNameId);
  if (!armName) return fail("That arm isn’t here any more.");
  const others = store.armNames.filter((a) => a.subdomain === subdomain && a.id !== armNameId);
  if (others.some((a) => sameName(a.name, name))) return fail("Two arms can’t share a name.", { name: ["Another arm has this name"] });
  if (others.some((a) => a.code === code)) return fail("Two arms can’t share a code.", { code: ["Another arm uses this code"] });
  const before = armName.name;
  Object.assign(armName, { name, code });
  if (before !== name) recordChange(subdomain, who.fullName, `Renamed the ${before} arm to ${name} in every class`);
  return { ok: true, data: null };
}

export async function setArmDepartment(subdomain: string, armId: string, department: Department | null): Promise<ActionResult<null>> {
  await pause();
  const who = await member(subdomain);
  if ("error" in who) return fail(who.error);
  const arm = armOf(subdomain, armId);
  const level = arm && levelOf(subdomain, arm.levelId);
  if (!arm || !level) return fail("That class isn’t here any more.");
  if (level.section !== "senior") return fail("Departments are for senior classes.");
  arm.department = department;
  recordChange(subdomain, who.fullName, `Set ${level.name} ${nameOf(subdomain, arm.armNameId)?.name ?? ""} to ${department ? DEPARTMENT_LABEL[department] : "no department"}`);
  return { ok: true, data: null };
}

export async function setArmArchived(subdomain: string, armId: string, archived: boolean): Promise<ActionResult<null>> {
  await pause();
  const who = await member(subdomain);
  if ("error" in who) return fail(who.error);
  const arm = armOf(subdomain, armId);
  const level = arm && levelOf(subdomain, arm.levelId);
  if (!arm || !level) return fail("That class isn’t here any more.");
  arm.archived = archived;
  recordChange(subdomain, who.fullName, `${archived ? "Archived" : "Brought back"} ${level.name} ${nameOf(subdomain, arm.armNameId)?.name ?? ""}`);
  return { ok: true, data: null };
}

/** No deleting an arm that has students, or a class's last arm (plan: "Editing after setup"). */
export async function removeArm(subdomain: string, armId: string): Promise<ActionResult<null>> {
  await pause();
  const who = await member(subdomain);
  if ("error" in who) return fail(who.error);
  const arm = armOf(subdomain, armId);
  const level = arm && levelOf(subdomain, arm.levelId);
  if (!arm || !level) return fail("That class isn’t here any more.");
  const label = `${level.name} ${nameOf(subdomain, arm.armNameId)?.name ?? ""}`;
  const students = studentsIn(armId);
  if (students) return fail(`${label} has ${students} ${students === 1 ? "student" : "students"}. Move them first, or archive it instead.`);
  if (store.arms.filter((a) => a.levelId === level.id).length === 1) return fail(`Every class needs at least one arm. Remove ${level.name} instead.`);
  store.arms = store.arms.filter((a) => a.id !== armId);
  recordChange(subdomain, who.fullName, `Removed ${label}`);
  return { ok: true, data: null };
}
