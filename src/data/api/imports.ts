// Importing students on the Brillianda API. Same functions and shapes as ../fake/imports.ts. The
// browser reads the file; the API checks and writes the rows with the same rules as ours.
import "server-only";
import { ms } from "@brillianda/core/apiBridge";
import type { CheckedRow, RawRow } from "@brillianda/core/studentImport";
import type { StudentGender } from "@brillianda/core/students";
import type { ActionResult, ImportResult, ImportSetup } from "../types";
import { api, fail, read } from "./client";

type Setup = Omit<ImportSetup, "batches"> & { batches: (Omit<ImportSetup["batches"][number], "at"> & { at: string })[] };

export async function getImportSetup(subdomain: string): Promise<ImportSetup | null> {
  const s = await read<Setup>(subdomain, "/v1/imports/setup");
  return s ? { ...s, batches: s.batches.map((b) => ({ ...b, at: ms(b.at) })) } : null;
}

export async function checkImport(subdomain: string, rows: RawRow[], armId: string | null): Promise<ActionResult<CheckedRow[]>> {
  const result = await api<{ rows: CheckedRow[] }>(subdomain, "/v1/imports/check", { method: "POST", body: { rows, armId } });
  if (!result.ok) return fail(result);
  // Genders come back in lower case.
  const checked = result.data.rows.map((r) => (r.student ? { ...r, student: { ...r.student, gender: r.student.gender.toUpperCase() as StudentGender } } : r));
  return { ok: true, data: checked };
}

export async function saveImportMapping(subdomain: string, mapping: Record<string, string>): Promise<void> {
  await api(subdomain, "/v1/imports/mapping", { method: "PUT", body: { mapping } });
}

export async function commitImport(subdomain: string, rows: RawRow[], armId: string | null, update: number[], fileName: string): Promise<ActionResult<ImportResult>> {
  const result = await api<ImportResult>(subdomain, "/v1/imports", { method: "POST", body: { rows, armId, update, fileName } });
  return result.ok ? { ok: true, data: result.data } : fail(result);
}

export async function undoImport(subdomain: string, batchId: string): Promise<ActionResult<{ removed: number }>> {
  const result = await api<{ removed: number }>(subdomain, `/v1/imports/${encodeURIComponent(batchId)}/undo`, { method: "POST" });
  return result.ok ? { ok: true, data: result.data } : fail(result);
}
