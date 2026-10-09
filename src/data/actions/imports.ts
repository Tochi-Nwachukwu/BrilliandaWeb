"use server";

// Importing students (plan: "How an import runs"; docs/data-contract.md). The browser reads the
// file and maps the columns; these check every row again and write. About `school`: see
// actions/auth.ts — the real actions take it from the request's host.
import { IMPORT_COLUMNS, MAX_IMPORT_ROWS, type CheckedRow, type RawRow } from "@brillianda/core";
import { revalidatePath } from "next/cache";
import * as impl from "../fake/imports";
import type { ActionResult, ImportResult } from "../types";

const COLUMN_IDS = new Set<string>(IMPORT_COLUMNS.map((c) => c.id));

/** Keeps only known columns, as strings, so nothing else reaches the check. */
function cleanRows(input: unknown): RawRow[] | null {
  if (!Array.isArray(input) || input.length > MAX_IMPORT_ROWS) return null;
  return input.map((row) =>
    Object.fromEntries(Object.entries((row ?? {}) as Record<string, unknown>).filter(([k, v]) => COLUMN_IDS.has(k) && typeof v === "string").map(([k, v]) => [k, (v as string).slice(0, 300)])),
  );
}

/** Checks every row on the server: ready, needs fixing, or a possible duplicate. */
export async function checkImport(school: string, rows: unknown, armId: string | null): Promise<ActionResult<CheckedRow[]>> {
  const clean = cleanRows(rows);
  if (!clean) return { ok: false, error: `Import up to ${MAX_IMPORT_ROWS} students at a time.` };
  return impl.checkImport(school, clean, armId ? String(armId) : null);
}

/** Writes the ready rows (chunks of 500, one batch id). `update` lists duplicate rows to update rather than skip. */
export async function commitImport(school: string, input: unknown): Promise<ActionResult<ImportResult>> {
  const value = (input ?? {}) as { rows?: unknown; armId?: unknown; update?: unknown; fileName?: unknown };
  const clean = cleanRows(value.rows);
  if (!clean) return { ok: false, error: `Import up to ${MAX_IMPORT_ROWS} students at a time.` };
  const update = Array.isArray(value.update) ? value.update.filter((n): n is number => Number.isInteger(n)) : [];
  const result = await impl.commitImport(school, clean, value.armId ? String(value.armId) : null, update, String(value.fileName ?? "a file").slice(0, 120));
  if (result.ok) revalidatePath(`/s/${school}`, "layout");
  return result;
}

/** Removes a batch's new students, within 24 hours and only if none was edited since. */
export async function undoImport(school: string, batchId: string): Promise<ActionResult<{ removed: number }>> {
  const result = await impl.undoImport(school, String(batchId));
  if (result.ok) revalidatePath(`/s/${school}`, "layout");
  return result;
}

/** Remembers how this school's headings map to columns, for its next import. */
export async function saveImportMapping(school: string, mapping: Record<string, string>): Promise<void> {
  const clean = Object.fromEntries(Object.entries(mapping ?? {}).filter(([k, v]) => typeof k === "string" && COLUMN_IDS.has(String(v))).slice(0, 40));
  await impl.saveImportMapping(school, clean);
}
