// CBT tests (batch 25; docs/data-contract.md). Screens import from here, never from fake/.
import "server-only";
import * as live from "./api/cbt";
import * as fake from "./fake/cbt";
import { LIVE } from "./source";
import type { StudentTestRow, TakingTest, TestEditorData, TestResults, TestRow } from "./types";

// The API where it has endpoints (DATA_SOURCE=api), else sample data.
const impl = LIVE ? live : fake;

/** A teacher's tests (all of them for admins), newest window first. */
export function getTests(subdomain: string): Promise<TestRow[] | null> {
  return impl.getTests(subdomain);
}

/** What can go into a test, and the draft being changed (if `testId`). */
export function getTestEditor(subdomain: string, testId?: string): Promise<TestEditorData | null> {
  return impl.getTestEditor(subdomain, testId);
}

/** A test's students, their answers and scores, for marking and sending scores. */
export function getTestResults(subdomain: string, testId: string): Promise<TestResults | null> {
  return impl.getTestResults(subdomain, testId);
}

/** The signed-in student's tests. */
export function getMyTests(subdomain: string): Promise<StudentTestRow[] | null> {
  return impl.getMyTests(subdomain);
}

/** One test for the signed-in student: its start page, or the questions once started (never the answers). */
export function getTakingTest(subdomain: string, testId: string): Promise<TakingTest | null> {
  return impl.getTakingTest(subdomain, testId);
}
