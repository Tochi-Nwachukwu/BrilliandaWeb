// FAKE: the school's subjects and which class levels take them, on sample data. The backend
// replaces this with the catalogue table and the school's subjects and subject links.
import "server-only";
import { DEPARTMENT_LABEL, type Department } from "@brillianda/core/classes";
import { bandOf, defaultLinks, type Band, type LinkKind } from "@brillianda/core/subjects";
import type { ActionResult, Subject, SubjectsSetup } from "../types";
import { requireMember } from "./auth";
import { CATALOGUE } from "./catalogue";
import { recordChange } from "./changes";
import { store } from "./store";

const pause = () => new Promise((resolve) => setTimeout(resolve, 300));
const fail = (error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> => ({ ok: false, error, fieldErrors });
const levelsOf = (subdomain: string) => store.levels.filter((l) => l.subdomain === subdomain && !l.archived).sort((a, b) => a.position - b.position);

function toSubject(s: (typeof store.subjects)[number]): Subject {
  const entry = s.catalogueId ? CATALOGUE.find((e) => e.id === s.catalogueId) : undefined;
  return { id: s.id, catalogueId: s.catalogueId, name: s.name, code: s.code, tag: entry?.tag ?? "custom", catalogueName: entry && entry.name !== s.name ? entry.name : null };
}

export async function getSubjectsSetup(subdomain: string): Promise<SubjectsSetup | null> {
  if (!(await requireMember(subdomain))) return null;
  const levels = levelsOf(subdomain);
  const bands = [...new Set(levels.map((l) => bandOf(l.key, l.section)).filter((b): b is Band => !!b))];
  return {
    subjects: store.subjects.filter((s) => s.subdomain === subdomain).sort((a, b) => a.position - b.position).map(toSubject),
    links: store.subjectLinks.filter((l) => l.subdomain === subdomain).map(({ subjectId, levelId, kind, department }) => ({ subjectId, levelId, kind, department })),
    levels: levels.map(({ id, key, name, short, section, position, archived }) => ({ id, key, name, short, section, position, archived })),
    catalogue: CATALOGUE,
    bands,
  };
}

/** Adds catalogue subjects (attached to their default levels) and the school's own (attached nowhere). */
export async function addSubjects(subdomain: string, catalogueIds: string[], custom: { name: string; code: string }[]): Promise<ActionResult<{ added: number }>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return fail("Sign in first.");
  const mine = store.subjects.filter((s) => s.subdomain === subdomain);
  const codes = new Set(mine.map((s) => s.code));
  const entries = CATALOGUE.filter((e) => catalogueIds.includes(e.id) && !mine.some((s) => s.catalogueId === e.id));
  const clash = [...entries.map((e) => e.code), ...custom.map((c) => c.code)].find((c) => codes.has(c));
  if (clash) return fail(`Another of your subjects already uses the code ${clash}. Rename it first.`);
  for (const c of custom) if (mine.some((s) => s.name.toLowerCase() === c.name.trim().toLowerCase())) return fail(`You already have ${c.name}.`);

  let position = mine.length;
  for (const e of entries) store.subjects.push({ id: crypto.randomUUID(), subdomain, catalogueId: e.id, name: e.name, code: e.code, position: position++ });
  for (const c of custom) store.subjects.push({ id: crypto.randomUUID(), subdomain, catalogueId: null, name: c.name.trim(), code: c.code, position: position++ });

  const idOf = (entryId: string) => store.subjects.find((s) => s.subdomain === subdomain && s.catalogueId === entryId)!.id;
  for (const link of defaultLinks(entries, levelsOf(subdomain))) {
    store.subjectLinks.push({ subdomain, subjectId: idOf(link.entryId), levelId: link.levelId, kind: link.kind, department: link.department });
  }
  const added = entries.length + custom.length;
  recordChange(subdomain, who.fullName, `Added ${added} ${added === 1 ? "subject" : "subjects"}`);
  return { ok: true, data: { added } };
}

const subjectOf = (subdomain: string, id: string) => store.subjects.find((s) => s.subdomain === subdomain && s.id === id);

export async function renameSubject(subdomain: string, subjectId: string, name: string, code: string): Promise<ActionResult<null>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return fail("Sign in first.");
  const subject = subjectOf(subdomain, subjectId);
  if (!subject) return fail("That subject isn’t here any more.");
  const others = store.subjects.filter((s) => s.subdomain === subdomain && s.id !== subjectId);
  if (others.some((s) => s.name.toLowerCase() === name.toLowerCase())) return fail("Two subjects can’t share a name.", { name: ["Another subject has this name"] });
  if (others.some((s) => s.code === code)) return fail("Two subjects can’t share a code.", { code: ["Another subject uses this code"] });
  const before = subject.name;
  Object.assign(subject, { name, code });
  if (before !== name) recordChange(subdomain, who.fullName, `Renamed ${before} to ${name}`);
  return { ok: true, data: null };
}

export async function removeSubject(subdomain: string, subjectId: string): Promise<ActionResult<null>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return fail("Sign in first.");
  const subject = subjectOf(subdomain, subjectId);
  if (!subject) return fail("That subject isn’t here any more.");
  store.subjects = store.subjects.filter((s) => s.id !== subjectId);
  store.subjectLinks = store.subjectLinks.filter((l) => l.subjectId !== subjectId);
  recordChange(subdomain, who.fullName, `Removed ${subject.name}`);
  return { ok: true, data: null };
}

/** Attaches a subject to a level as compulsory or elective, or detaches it (kind null). */
export async function setSubjectLink(subdomain: string, subjectId: string, levelId: string, kind: LinkKind | null): Promise<ActionResult<null>> {
  const who = await requireMember(subdomain);
  if (!who) return fail("Sign in first.");
  const subject = subjectOf(subdomain, subjectId);
  const level = store.levels.find((l) => l.subdomain === subdomain && l.id === levelId);
  if (!subject || !level) return fail("That subject or class isn’t here any more.");
  const existing = store.subjectLinks.find((l) => l.subjectId === subjectId && l.levelId === levelId);
  if (!kind) {
    store.subjectLinks = store.subjectLinks.filter((l) => l !== existing);
  } else if (existing) {
    existing.kind = kind;
    if (kind === "compulsory") existing.department = null;
  } else {
    const entry = subject.catalogueId ? CATALOGUE.find((e) => e.id === subject.catalogueId) : undefined;
    const band = bandOf(level.key, level.section);
    const fromCatalogue = entry && band ? defaultLinks([entry], [level])[0] : undefined;
    store.subjectLinks.push({ subdomain, subjectId, levelId, kind, department: kind === "elective" ? (fromCatalogue?.department ?? null) : null });
  }
  return { ok: true, data: null };
}

/** The department a subject's senior electives belong to (plan: an SS arm marked Science gets the Science electives). */
export async function setSubjectDepartment(subdomain: string, subjectId: string, department: Department | null): Promise<ActionResult<null>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return fail("Sign in first.");
  const subject = subjectOf(subdomain, subjectId);
  if (!subject) return fail("That subject isn’t here any more.");
  const senior = new Set(store.levels.filter((l) => l.subdomain === subdomain && l.section === "senior").map((l) => l.id));
  for (const link of store.subjectLinks) if (link.subjectId === subjectId && senior.has(link.levelId) && link.kind === "elective") link.department = department;
  recordChange(subdomain, who.fullName, `Put ${subject.name} in ${department ? DEPARTMENT_LABEL[department] : "no department"}`);
  return { ok: true, data: null };
}
