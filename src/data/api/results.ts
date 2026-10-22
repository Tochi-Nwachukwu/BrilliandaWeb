// Results settings and score entry, on the Brillianda API. Same functions and shapes as
// ../fake/results.ts; the API uses the same grading.ts and results.ts.
import "server-only";
import type { ResultsSettings } from "@brillianda/core/results";
import type { ActionResult, ResultsOverview, ResultsSettingsData, ResultsTerm, ScoreSheetData, SheetStatus, SheetSummary } from "../types";
import { api, fail, read } from "./client";

const id = encodeURIComponent;
const sheet = (armId: string, subjectId: string) => `/v1/arms/${id(armId)}/subjects/${id(subjectId)}/sheet`;
const done = (result: { ok: true } | { ok: false; problem: Parameters<typeof fail>[0]["problem"] }): ActionResult<null> =>
  result.ok ? { ok: true, data: null } : fail(result);

export async function getResultsSettings(subdomain: string): Promise<ResultsSettingsData | null> {
  return read<ResultsSettingsData>(subdomain, "/v1/results/settings");
}

export async function saveResultsSettings(subdomain: string, input: ResultsSettings): Promise<ActionResult<null>> {
  return done(await api(subdomain, "/v1/results/settings", { method: "PUT", body: input }));
}

export async function getResultsOverview(subdomain: string): Promise<ResultsOverview | null> {
  return read<ResultsOverview>(subdomain, "/v1/results");
}

export async function getArmSheets(subdomain: string, armId: string): Promise<{ term: ResultsTerm; armLabel: string; sheets: SheetSummary[] } | null> {
  return read(subdomain, `/v1/arms/${id(armId)}/sheets`);
}

export async function getMySheets(subdomain: string): Promise<{ term: ResultsTerm | null; sheets: SheetSummary[] } | null> {
  return read(subdomain, "/v1/me/sheets");
}

export async function getScoreSheet(subdomain: string, armId: string, subjectId: string): Promise<ScoreSheetData | null> {
  return read<ScoreSheetData>(subdomain, sheet(armId, subjectId));
}

export async function saveScore(subdomain: string, armId: string, subjectId: string, studentId: string, componentId: string, raw: string): Promise<ActionResult<{ status: SheetStatus }>> {
  const result = await api<{ status: SheetStatus }>(subdomain, `${sheet(armId, subjectId)}/scores`, { method: "PUT", body: { studentId, componentId, raw } });
  return result.ok ? { ok: true, data: result.data } : fail(result);
}

export async function setExcluded(subdomain: string, armId: string, subjectId: string, studentId: string, excluded: boolean): Promise<ActionResult<null>> {
  return done(await api(subdomain, `${sheet(armId, subjectId)}/excluded`, { method: "PUT", body: { studentId, excluded } }));
}

export async function markComplete(subdomain: string, armId: string, subjectId: string): Promise<ActionResult<null>> {
  return done(await api(subdomain, `${sheet(armId, subjectId)}/complete`, { method: "POST" }));
}

export async function requestUnlock(subdomain: string, armId: string, subjectId: string, reason: string): Promise<ActionResult<null>> {
  return done(await api(subdomain, `${sheet(armId, subjectId)}/unlock-request`, { method: "POST", body: { reason } }));
}

export async function resolveUnlock(subdomain: string, armId: string, subjectId: string, approve: boolean): Promise<ActionResult<null>> {
  return done(await api(subdomain, `${sheet(armId, subjectId)}/unlock`, { method: "POST", body: { approve } }));
}
