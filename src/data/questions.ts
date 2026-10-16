// The question bank (batch 24; docs/data-contract.md). Screens import from here, never from fake/.
import "server-only";
import * as impl from "./fake/questions";
import type { QuestionBankPage } from "./types";

/** The questions a teacher can see and write (their own subjects and classes; all for admins), and this month's AI use. */
export function getQuestionBank(subdomain: string): Promise<QuestionBankPage | null> {
  return impl.getQuestionBank(subdomain);
}
