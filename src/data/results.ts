// Results (batch 14; docs/data-contract.md). Screens import from here, never from fake/.
import "server-only";
import * as live from "./api/results";
import * as fake from "./fake/results";
import { LIVE } from "./source";

// The API where it has endpoints (DATA_SOURCE=api), else sample data.
const impl = LIVE ? live : fake;
import type { ResultsOverview, ResultsSettingsData, ResultsTerm, ScoreSheetData, SheetSummary } from "./types";

/** The school's score parts, grading scale and whether positions show. Owners and admins. */
export function getResultsSettings(subdomain: string): Promise<ResultsSettingsData | null> {
  return impl.getResultsSettings(subdomain);
}

/** One subject's sheet for one arm this term. Admins, or that subject's teacher for the arm. */
export function getScoreSheet(subdomain: string, armId: string, subjectId: string): Promise<ScoreSheetData | null> {
  return impl.getScoreSheet(subdomain, armId, subjectId);
}

/** Admin's Results page: each class's progress this term, and unlock requests waiting. */
export function getResultsOverview(subdomain: string): Promise<ResultsOverview | null> {
  return impl.getResultsOverview(subdomain);
}

/** One class's sheets this term, with status and teacher. Owners and admins. */
export function getArmSheets(subdomain: string, armId: string): Promise<{ term: ResultsTerm; armLabel: string; sheets: SheetSummary[] } | null> {
  return impl.getArmSheets(subdomain, armId);
}

/** A teacher's own sheets this term. */
export function getMySheets(subdomain: string): Promise<{ term: ResultsTerm | null; sheets: SheetSummary[] } | null> {
  return impl.getMySheets(subdomain);
}
