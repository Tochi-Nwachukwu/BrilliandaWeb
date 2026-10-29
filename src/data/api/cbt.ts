// CBT, on the Brillianda API. Same functions and shapes as ../fake/cbt.ts.
import "server-only";
import type { TestSettings } from "@brillianda/core/cbt";
import type { Response } from "@brillianda/core/questions";
import type { ActionResult, StudentTestRow, TakingTest, TestEditorData, TestResults, TestRow } from "../types";
import { api, fail, read } from "./client";

const id = encodeURIComponent;
const none = (r: { ok: true } | { ok: false; problem: Parameters<typeof fail>[0]["problem"] }): ActionResult<null> => (r.ok ? { ok: true, data: null } : fail(r));

export async function getTests(subdomain: string): Promise<TestRow[] | null> {
  return read<TestRow[]>(subdomain, "/v1/tests");
}

export async function getTestEditor(subdomain: string, testId?: string): Promise<TestEditorData | null> {
  return read<TestEditorData>(subdomain, "/v1/tests/editor", { test: testId });
}

export async function saveTest(subdomain: string, testId: string | null, subjectId: string, levelId: string, settings: TestSettings, publish: boolean): Promise<ActionResult<{ id: string }>> {
  const body = { subjectId, levelId, publish, settings };
  const result = testId ? await api<{ id: string }>(subdomain, `/v1/tests/${id(testId)}`, { method: "PUT", body }) : await api<{ id: string }>(subdomain, "/v1/tests", { method: "POST", body });
  return result.ok ? { ok: true, data: result.data } : fail(result);
}

export async function deleteTest(subdomain: string, testId: string): Promise<ActionResult<null>> {
  return none(await api(subdomain, `/v1/tests/${id(testId)}`, { method: "DELETE" }));
}

export async function getTestResults(subdomain: string, testId: string): Promise<TestResults | null> {
  return read<TestResults>(subdomain, `/v1/tests/${id(testId)}/results`);
}

export async function markTheory(subdomain: string, testId: string, attemptId: string, index: number, marks: number): Promise<ActionResult<null>> {
  return none(await api(subdomain, `/v1/tests/${id(testId)}/attempts/${id(attemptId)}/marks/${index}`, { method: "PUT", body: { marks } }));
}

export async function sendScores(subdomain: string, testId: string): Promise<ActionResult<{ sent: number; skipped: number; lockedClasses: string[] }>> {
  const result = await api<{ sent: number; skipped: number; lockedClasses: string[] }>(subdomain, `/v1/tests/${id(testId)}/send-scores`, { method: "POST" });
  return result.ok ? { ok: true, data: result.data } : fail(result);
}

export async function getMyTests(subdomain: string): Promise<StudentTestRow[] | null> {
  return read<StudentTestRow[]>(subdomain, "/v1/me/tests");
}

export async function getTakingTest(subdomain: string, testId: string): Promise<TakingTest | null> {
  return read<TakingTest>(subdomain, `/v1/me/tests/${id(testId)}`);
}

export async function startTest(subdomain: string, testId: string, code: string): Promise<ActionResult<null>> {
  return none(await api(subdomain, `/v1/me/tests/${id(testId)}/start`, { method: "POST", body: { code } }));
}

export async function saveAnswer(subdomain: string, testId: string, index: number, response: Response | null): Promise<ActionResult<null>> {
  return none(await api(subdomain, `/v1/me/tests/${id(testId)}/answers/${index}`, { method: "PUT", body: { response } }));
}

export async function noteLeftPage(subdomain: string, testId: string): Promise<void> {
  await api(subdomain, `/v1/me/tests/${id(testId)}/left`, { method: "POST" });
}

export async function submitTest(subdomain: string, testId: string): Promise<ActionResult<{ score: { total: number; max: number; complete: boolean } | null }>> {
  const result = await api<{ score: { total: number; max: number; complete: boolean } | null }>(subdomain, `/v1/me/tests/${id(testId)}/submit`, { method: "POST" });
  return result.ok ? { ok: true, data: result.data } : fail(result);
}
