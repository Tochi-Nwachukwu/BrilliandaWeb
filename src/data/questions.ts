// The question bank (batch 24; docs/data-contract.md). Screens import from here, never from fake/.
import "server-only";
import * as live from "./api/questions";
import * as fake from "./fake/questions";
import { LIVE } from "./source";
import type { QuestionBankPage } from "./types";

// The API where it has endpoints (DATA_SOURCE=api), else sample data.
const impl = LIVE ? live : fake;

/** The questions a teacher can see and write (their own subjects and classes; all for admins), and this month's AI use. */
export function getQuestionBank(subdomain: string): Promise<QuestionBankPage | null> {
  return impl.getQuestionBank(subdomain);
}
