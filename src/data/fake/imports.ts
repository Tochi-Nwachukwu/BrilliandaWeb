// FAKE: importing students on sample data. The backend replaces this with a real check of every
// row, chunked inserts tagged with an import batch id, and undo (plan: "How an import runs").
import "server-only";
import { formatAdmissionNo, sameAdmissionNo } from "@brillianda/core/admission";
import { checkRows, IMPORT_CHUNK, UNDO_HOURS, type CheckedRow, type ImportContext, type RawRow } from "@brillianda/core/studentImport";
import { fullName } from "@brillianda/core/students";
import type { ActionResult, ImportBatchSummary, ImportResult, ImportSetup } from "../types";
import { requireMember } from "./auth";
import { recordChange } from "./changes";
import { store } from "./store";

const fail = (error: string): ActionResult<never> => ({ ok: false, error });

function contextFor(subdomain: string, armId: string | null): ImportContext {
  const levels = store.levels
    .filter((l) => l.subdomain === subdomain && !l.archived)
    .sort((a, b) => a.position - b.position)
    .map((l) => ({ id: l.id, name: l.name, short: l.short }));
  const names = new Map(store.armNames.filter((a) => a.subdomain === subdomain).map((a) => [a.id, a]));
  const arms = store.arms
    .filter((a) => a.subdomain === subdomain && !a.archived)
    .map((a) => ({ id: a.id, levelId: a.levelId, name: names.get(a.armNameId)?.name ?? "", code: names.get(a.armNameId)?.code ?? "" }));
  const existing = store.students
    .filter((s) => s.subdomain === subdomain && !s.deletedAt)
    .map((s) => ({ id: s.id, admissionNo: s.admissionNo, fullName: fullName(s), dateOfBirth: s.dateOfBirth }));
  return { levels, arms, existing, armId };
}

const undoDeadline = (at: number) => at + UNDO_HOURS * 60 * 60 * 1000;
function summary(b: (typeof store.importBatches)[number]): ImportBatchSummary {
  const edited = store.students.some((s) => b.created.includes(s.id) && s.updatedAt > b.at + 1000);
  return { id: b.id, at: b.at, by: b.by, fileName: b.fileName, created: b.created.length, updated: b.updated, undone: !!b.undoneAt, undoable: !b.undoneAt && Date.now() < undoDeadline(b.at) && !edited && b.created.length > 0 };
}

export async function getImportSetup(subdomain: string): Promise<ImportSetup | null> {
  if (!(await requireMember(subdomain))) return null;
  const ctx = contextFor(subdomain, null);
  return {
    schoolName: store.schools.find((s) => s.subdomain === subdomain)?.name ?? "",
    levels: ctx.levels,
    arms: ctx.arms,
    existing: ctx.existing,
    savedMapping: store.importMappings.get(subdomain) ?? {},
    batches: store.importBatches
      .filter((b) => b.subdomain === subdomain)
      .sort((a, b) => b.at - a.at)
      .slice(0, 5)
      .map(summary),
  };
}

/** The server's own check of every row; it never trusts the browser's (plan). */
export async function checkImport(subdomain: string, rows: RawRow[], armId: string | null): Promise<ActionResult<CheckedRow[]>> {
  if (!(await requireMember(subdomain))) return fail("Sign in first.");
  await new Promise((resolve) => setTimeout(resolve, 300));
  return { ok: true, data: checkRows(rows, contextFor(subdomain, armId)) };
}

export async function saveImportMapping(subdomain: string, mapping: Record<string, string>): Promise<void> {
  if (await requireMember(subdomain)) store.importMappings.set(subdomain, mapping);
}

/**
 * Writes the ready rows in chunks of 500 under one batch id. Duplicate admission numbers are
 * updated or skipped as the admin chose; rows that still need fixing are left out.
 */
export async function commitImport(subdomain: string, rows: RawRow[], armId: string | null, update: number[], fileName: string): Promise<ActionResult<ImportResult>> {
  const who = await requireMember(subdomain);
  if (!who) return fail("Sign in first.");
  const checked = checkRows(rows, contextFor(subdomain, armId));
  const batchId = crypto.randomUUID();
  const now = Date.now();
  const settings = store.admission.get(subdomain) ?? { pattern: "ADM/{YEAR}/{NUMBER}", digits: 4, next: 1 };
  store.admission.set(subdomain, settings);
  const year = store.calendars.get(subdomain)?.startYear ?? new Date().getFullYear();
  const live = () => store.students.filter((s) => s.subdomain === subdomain && !s.deletedAt);
  const created: ImportResult["newStudents"] = [];
  let updated = 0;
  let skipped = 0;

  const guardianFor = (s: NonNullable<CheckedRow["student"]>) => {
    if (!s.guardianName && !s.guardianPhone) return null;
    // Siblings share a guardian: the same phone number links to the same record.
    const same = s.guardianPhone && store.guardians.find((g) => g.subdomain === subdomain && g.phone === s.guardianPhone);
    if (same) return same.id;
    if (!s.guardianName) return null;
    const id = crypto.randomUUID();
    store.guardians.push({ id, subdomain, name: s.guardianName, phone: s.guardianPhone || null, email: s.guardianEmail || null });
    return id;
  };

  const ready = checked.filter((r) => r.student && (r.status === "ready" || r.status === "duplicate"));
  for (let start = 0; start < ready.length; start += IMPORT_CHUNK) {
    for (const row of ready.slice(start, start + IMPORT_CHUNK)) {
      const s = row.student!;
      if (row.status === "duplicate") {
        const existing = live().find((x) => x.id === row.existingId);
        if (!existing || !update.includes(row.index)) {
          skipped++;
          continue;
        }
        Object.assign(existing, {
          firstName: s.firstName,
          lastName: s.lastName,
          otherNames: s.otherNames,
          gender: s.gender,
          dateOfBirth: s.dateOfBirth || existing.dateOfBirth,
          address: s.address || existing.address,
          stateOfOrigin: s.stateOfOrigin || existing.stateOfOrigin,
          guardianId: guardianFor(s) ?? existing.guardianId,
          updatedAt: now,
        });
        if (existing.armId !== s.armId) {
          existing.armId = s.armId;
          store.enrolments.push({ studentId: existing.id, armId: s.armId, from: new Date(now).toISOString().slice(0, 10) });
        }
        recordChange(subdomain, who.fullName, `Updated ${fullName(existing)} from an import`, existing.id);
        updated++;
        continue;
      }
      let admissionNo = s.admissionNo;
      if (!admissionNo) {
        do admissionNo = formatAdmissionNo(settings, year, settings.next++);
        while (live().some((x) => sameAdmissionNo(x.admissionNo, admissionNo)));
      }
      const id = crypto.randomUUID();
      const admissionDate = s.admissionDate || new Date(now).toISOString().slice(0, 10);
      store.students.push({
        id,
        subdomain,
        armId: s.armId,
        status: "active",
        firstName: s.firstName,
        lastName: s.lastName,
        otherNames: s.otherNames,
        gender: s.gender,
        dateOfBirth: s.dateOfBirth,
        admissionNo,
        admissionDate,
        address: s.address,
        stateOfOrigin: s.stateOfOrigin,
        guardianId: guardianFor(s),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        importBatchId: batchId,
      });
      store.enrolments.push({ studentId: id, armId: s.armId, from: admissionDate });
      created.push({ id, fullName: fullName(s), armLabel: s.armLabel });
    }
  }
  store.importBatches.push({ id: batchId, subdomain, at: now, by: who.fullName, created: created.map((c) => c.id), updated, fileName, undoneAt: null });
  recordChange(subdomain, who.fullName, `Imported ${created.length} ${created.length === 1 ? "student" : "students"} from ${fileName}${updated ? `, updated ${updated}` : ""}`);
  return { ok: true, data: { batchId, created: created.length, updated, skipped, notImported: checked.filter((r) => r.status === "fix").length, newStudents: created } };
}

/** Removes a whole batch's new students within 24 hours, if nobody has edited them since (plan). */
export async function undoImport(subdomain: string, batchId: string): Promise<ActionResult<{ removed: number }>> {
  const who = await requireMember(subdomain);
  if (!who) return fail("Sign in first.");
  const batch = store.importBatches.find((b) => b.id === batchId && b.subdomain === subdomain);
  if (!batch) return fail("That import isn’t here.");
  const state = summary(batch);
  if (state.undone) return fail("That import was already undone.");
  if (Date.now() >= undoDeadline(batch.at)) return fail(`Imports can be undone for ${UNDO_HOURS} hours. This one is older.`);
  if (!state.undoable) return fail("Someone has edited students from this import since, so it can’t be undone as a whole. Delete or change them one by one.");
  const now = Date.now();
  for (const s of store.students) if (batch.created.includes(s.id) && !s.deletedAt) s.deletedAt = now;
  batch.undoneAt = now;
  recordChange(subdomain, who.fullName, `Undid the import of ${batch.created.length} students from ${batch.fileName}`);
  return { ok: true, data: { removed: batch.created.length } };
}
