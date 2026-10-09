// The class ladder and arms (plan: "The class ladder", "Arms"). One ordered ladder of class levels;
// the school picks a first and a last class and every level in between is made in order, so
// promotion later knows JSS 3 leads to SS 1. Arms split each class (JSS 1 Anthurium).
import { z } from "zod";
import type { SchoolLevel } from "./signup";

export type Section = "preschool" | "primary" | "junior" | "senior";
export const SECTION_LABEL: Record<Section, string> = {
  preschool: "Pre-school",
  primary: "Primary",
  junior: "Junior secondary",
  senior: "Senior secondary",
};

/** Every place on the ladder, youngest first. A scheme names each one (or leaves it out). */
export const LADDER = [
  { key: "creche", section: "preschool" },
  { key: "prenursery", section: "preschool" },
  { key: "nursery1", section: "preschool" },
  { key: "nursery2", section: "preschool" },
  { key: "nursery3", section: "preschool" },
  ...[1, 2, 3, 4, 5, 6].map((n) => ({ key: `primary${n}`, section: "primary" as const })),
  ...[1, 2, 3].map((n) => ({ key: `jss${n}`, section: "junior" as const })),
  ...[1, 2, 3].map((n) => ({ key: `ss${n}`, section: "senior" as const })),
] as const satisfies readonly { key: string; section: Section }[];
export type LadderKey = (typeof LADDER)[number]["key"];

export type NamingScheme = "nigerian" | "basic" | "british" | "american";
export const SCHEME_LABEL: Record<NamingScheme, string> = { nigerian: "Nigerian", basic: "Basic", british: "British", american: "American" };

type Named = { name: string; short: string } | null;
const nums = (prefix: string, short: string, from: number, count: number): Named[] =>
  Array.from({ length: count }, (_, i) => ({ name: `${prefix} ${from + i}`, short: `${short}${from + i}` }));

const PRESCHOOL_NIGERIAN: Named[] = [
  { name: "Creche", short: "CR" },
  { name: "Pre-Nursery", short: "PN" },
  ...nums("Nursery", "N", 1, 3),
];

/** Names for each ladder place, in LADDER order. null leaves that place out of the scheme. */
const SCHEMES: Record<NamingScheme, Named[]> = {
  nigerian: [...PRESCHOOL_NIGERIAN, ...nums("Primary", "P", 1, 6), ...nums("JSS", "JSS", 1, 3), ...nums("SS", "SS", 1, 3)],
  basic: [...PRESCHOOL_NIGERIAN, ...nums("Basic", "B", 1, 9), ...nums("SS", "SS", 1, 3)],
  british: [
    { name: "Creche", short: "CR" },
    { name: "Playgroup", short: "PG" },
    { name: "Nursery", short: "NUR" },
    { name: "Reception", short: "REC" },
    null,
    ...nums("Year", "Y", 1, 12),
  ],
  american: [
    { name: "Creche", short: "CR" },
    { name: "Pre-K", short: "PK" },
    { name: "KG 1", short: "KG1" },
    { name: "KG 2", short: "KG2" },
    null,
    ...nums("Grade", "G", 1, 12),
  ],
};

/** A class level as the school will have it. Custom ones (Year 13, Pre-JSS) have no ladder key. */
export type ClassLevelDraft = { key: LadderKey | null; name: string; short: string; section: Section };

/** The places a scheme offers, as pickers for the first and last class. */
export function ladderOptions(scheme: NamingScheme): ClassLevelDraft[] {
  return LADDER.flatMap((place, i) => {
    const named = SCHEMES[scheme][i];
    return named ? [{ key: place.key, section: place.section, ...named }] : [];
  });
}

/** Every level from `first` to `last` inclusive, in order, in the given scheme. */
export function buildLadder(first: LadderKey, last: LadderKey, scheme: NamingScheme): ClassLevelDraft[] {
  const options = ladderOptions(scheme);
  const from = options.findIndex((o) => o.key === first);
  const to = options.findIndex((o) => o.key === last);
  if (from < 0 || to < 0) return [];
  return from <= to ? options.slice(from, to + 1) : options.slice(to, from + 1);
}

/** Renames a ladder to another scheme, keeping custom levels and the school's own renames out of it. */
export function renameLadder(levels: ClassLevelDraft[], scheme: NamingScheme): ClassLevelDraft[] {
  const options = ladderOptions(scheme);
  return levels.flatMap((level) => {
    if (!level.key) return [level];
    const named = options.find((o) => o.key === level.key);
    return named ? [named] : [];
  });
}

/**
 * The plan's defaults from the levels ticked at signup: Secondary gives JSS 1 to SS 3, Primary gives
 * Nursery 1 to Primary 6, both give Nursery 1 to SS 3. Nursery on its own runs Creche to Nursery 3.
 */
export function defaultRange(levels: SchoolLevel[]): { first: LadderKey; last: LadderKey } {
  const has = (l: SchoolLevel) => levels.includes(l);
  const first: LadderKey = has("NURSERY") && !has("PRIMARY") && !has("SECONDARY") ? "creche" : has("PRIMARY") || has("NURSERY") ? "nursery1" : "jss1";
  const last: LadderKey = has("SECONDARY") ? "ss3" : has("PRIMARY") ? "primary6" : has("NURSERY") ? "nursery3" : "ss3";
  return { first, last };
}

// ——— Arms ———

export const MAX_ARMS = 10;

export const ARM_PRESETS = {
  letters: { label: "Letters", names: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"] },
  colours: { label: "Colours", names: ["Blue", "Gold", "Green", "Red", "Purple", "Orange", "Silver", "White", "Yellow", "Pink"] },
  flowers: { label: "Flowers", names: ["Anthurium", "Begonia", "Calla Lily", "Daisy", "Freesia", "Gardenia", "Hibiscus", "Iris", "Jasmine", "Lavender"] },
  gems: { label: "Gems", names: ["Diamond", "Emerald", "Ruby", "Sapphire", "Topaz", "Amethyst", "Pearl", "Opal", "Jade", "Garnet"] },
} as const;
export type ArmPreset = keyof typeof ARM_PRESETS;

/** A short code for tight screens: Anthurium → ANT, Calla Lily → CAL, A → A. */
export function armCode(name: string): string {
  const letters = name.normalize("NFKD").replace(/[^A-Za-z0-9 ]/g, "").trim().toUpperCase();
  if (letters.length <= 3) return letters.replace(/\s+/g, "");
  return letters.replace(/\s+/g, "").slice(0, 3);
}

/** Codes for a list of arm names, made unique: Diamond and Diana become DIA and DI2. */
export function armCodes(names: string[]): string[] {
  const used = new Set<string>();
  return names.map((name) => {
    let code = armCode(name) || "ARM";
    for (let n = 2; used.has(code); n++) code = `${armCode(name).slice(0, 2)}${n}`;
    used.add(code);
    return code;
  });
}

/** "JSS 1 Anthurium", or just "JSS 1" when the class has one arm (plan: one arm shows plain). */
export function armLabel(levelName: string, armName: string, armsInLevel: number): string {
  return armsInLevel > 1 ? `${levelName} ${armName}` : levelName;
}

/** The phone chip: "JSS1 ANT", or "JSS1" for a class with one arm. */
export function armChip(levelShort: string, code: string, armsInLevel: number): string {
  return armsInLevel > 1 ? `${levelShort} ${code}` : levelShort;
}

/** The preview the plan asks for: "This creates 18 classes: JSS 1 Anthurium, JSS 1 Begonia, … and 15 more." */
export function previewSentence(labels: string[], shown = 3): string {
  if (!labels.length) return "This creates no classes yet.";
  const head = labels.slice(0, shown).join(", ");
  const rest = labels.length - shown;
  const noun = labels.length === 1 ? "class" : "classes";
  return `This creates ${labels.length} ${noun}: ${rest > 0 ? `${head} and ${rest} more` : head}.`;
}

export const DEPARTMENTS = ["science", "arts", "commercial"] as const;
export type Department = (typeof DEPARTMENTS)[number];
export const DEPARTMENT_LABEL: Record<Department, string> = { science: "Science", arts: "Arts", commercial: "Commercial" };

// ——— What the quick setup sends ———

const levelName = z.string().trim().min(1, "Give the class a name").max(40, "Use at most 40 characters");
const shortName = z.string().trim().min(1, "Give it a short name").max(8, "Use at most 8 characters");

const levelsList = z
  .array(z.object({ key: z.string().nullable(), name: levelName, short: shortName, section: z.enum(["preschool", "primary", "junior", "senior"]) }))
  .min(1, "Add at least one class")
  .max(30, "That’s more classes than a school has");

const noRepeatedLevels = (levels: { name: string }[], ctx: z.RefinementCtx) => {
  const seen = new Set<string>();
  levels.forEach((level, i) => {
    const key = level.name.trim().toLowerCase();
    if (key && seen.has(key)) ctx.addIssue({ code: "custom", path: ["levels", i, "name"], message: "Two classes can’t share a name" });
    seen.add(key);
  });
};

/** Step 1 of the quick setup on its own: the classes, before their arms. */
export const classLevelsStepSchema = z.object({ levels: levelsList }).superRefine((step, ctx) => noRepeatedLevels(step.levels, ctx));

export const classSetupSchema = z
  .object({
    levels: levelsList,
    arms: z
      .array(z.object({ name: z.string().trim().min(1, "Give the arm a name").max(30, "Use at most 30 characters"), code: z.string().trim().min(1, "Give it a code").max(4, "Use at most 4 characters") }))
      .min(1, "Every class needs at least one arm")
      .max(MAX_ARMS, `At most ${MAX_ARMS} arms`),
    /** For each level (same order), the arms it has, as indexes into `arms`. */
    armsByLevel: z.array(z.array(z.number().int().min(0)).min(1, "Every class needs at least one arm")),
  })
  .superRefine((setup, ctx) => {
    if (setup.armsByLevel.length !== setup.levels.length) ctx.addIssue({ code: "custom", path: ["armsByLevel"], message: "Every class needs its arms" });
    noRepeatedLevels(setup.levels, ctx);
    const names = setup.arms.map((a) => a.name.trim().toLowerCase());
    names.forEach((name, i) => {
      if (names.indexOf(name) !== i) ctx.addIssue({ code: "custom", path: ["arms", i, "name"], message: "Two arms can’t share a name" });
    });
    const codes = setup.arms.map((a) => a.code.trim().toUpperCase());
    codes.forEach((code, i) => {
      if (codes.indexOf(code) !== i) ctx.addIssue({ code: "custom", path: ["arms", i, "code"], message: "Two arms can’t share a code" });
    });
    setup.armsByLevel.forEach((list, i) => {
      if (list.some((index) => index >= setup.arms.length)) ctx.addIssue({ code: "custom", path: ["armsByLevel", i], message: "That arm doesn’t exist" });
    });
  });
export type ClassSetupInput = z.infer<typeof classSetupSchema>;

/** Every class (level + arm) the setup makes, labelled for the preview. */
export function setupLabels(setup: Pick<ClassSetupInput, "levels" | "arms" | "armsByLevel">): string[] {
  return setup.levels.flatMap((level, i) => {
    const arms = setup.armsByLevel[i] ?? [];
    return arms.map((index) => armLabel(level.name, setup.arms[index]?.name ?? "", arms.length));
  });
}

// ——— Edits after setup ———

/** Renaming a class: its display name and short name. */
export const levelNameSchema = z.object({ name: levelName, short: shortName });

/** A new class added after setup (Year 13, a Pre-JSS class): where it sits comes from its section. */
export const newLevelSchema = z.object({ name: levelName, short: shortName, section: z.enum(["preschool", "primary", "junior", "senior"]) });

/** An arm name lives once per school, so renaming it renames it in every class. */
export const armNameSchema = z.object({
  name: z.string().trim().min(1, "Give the arm a name").max(30, "Use at most 30 characters"),
  code: z
    .string()
    .trim()
    .min(1, "Give it a code")
    .max(4, "Use at most 4 characters")
    .transform((c) => c.toUpperCase()),
});

/**
 * Every arm at once (Classes › Edit arms): the school's arm names in order, and which classes have
 * each. `key` is an arm name's id, or any new key (e.g. "new-1") for one added in the editor.
 * `levels` lists every class that is in use, each with the keys of the arms it should have.
 */
export const armLayoutSchema = z
  .object({
    names: z
      .array(z.object({ key: z.string().min(1), ...armNameSchema.shape }))
      .min(1, "Keep at least one arm")
      .max(26, "Use at most 26 arms"),
    levels: z.array(z.object({ levelId: z.string().min(1), arms: z.array(z.string()) })),
  })
  .superRefine((layout, ctx) => {
    const seenName = new Map<string, number>();
    const seenCode = new Map<string, number>();
    layout.names.forEach((arm, i) => {
      const name = arm.name.toLowerCase();
      if (seenName.has(name)) ctx.addIssue({ code: "custom", path: ["names", i, "name"], message: "Two arms can’t share a name" });
      else seenName.set(name, i);
      if (seenCode.has(arm.code)) ctx.addIssue({ code: "custom", path: ["names", i, "code"], message: "Two arms can’t share a code" });
      else seenCode.set(arm.code, i);
    });
    const keys = new Set(layout.names.map((n) => n.key));
    layout.levels.forEach((level, i) => {
      if (!level.arms.length) ctx.addIssue({ code: "custom", path: ["levels", i, "arms"], message: "Every class needs at least one arm" });
      if (level.arms.some((key) => !keys.has(key))) ctx.addIssue({ code: "custom", path: ["levels", i, "arms"], message: "That arm isn’t in the list" });
    });
  });
export type ArmLayout = z.infer<typeof armLayoutSchema>;
