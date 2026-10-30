// The question bank, on the Brillianda API. Same functions and shapes as ../fake/questions.ts.
import "server-only";
import type { GenerateRequest, Question, ReadNotesRequest } from "@brillianda/core/questions";
import type { ActionResult, QuestionBankPage } from "../types";
import { api, fail, read } from "./client";

const id = encodeURIComponent;

export async function getQuestionBank(subdomain: string): Promise<QuestionBankPage | null> {
  return read<QuestionBankPage>(subdomain, "/v1/questions");
}

export async function generateQuestions(subdomain: string, req: GenerateRequest): Promise<ActionResult<{ questions: Question[]; usage: QuestionBankPage["usage"] }>> {
  const result = await api<{ questions: Question[]; usage: QuestionBankPage["usage"] }>(subdomain, "/v1/questions/generate", { method: "POST", body: req });
  return result.ok ? { ok: true, data: result.data } : fail(result);
}

/** Photos and PDFs of lesson notes to text. The API reads them with the model and keeps nothing. */
export async function readNotes(subdomain: string, input: ReadNotesRequest): Promise<ActionResult<{ text: string }>> {
  const result = await api<{ text: string }>(subdomain, "/v1/questions/notes", { method: "POST", body: input });
  if (result.ok) return { ok: true, data: result.data };
  // Until the API has it (docs/backend-requirements.md, A3), or while AI is switched off.
  if (result.status === 404 || result.status === 405 || result.problem.code === "ai_disabled") return { ok: false, error: "Reading photos and PDFs isn’t switched on yet. Type or paste your notes, or add a Word or text file." };
  return fail(result);
}

export async function saveQuestions(subdomain: string, subjectId: string, levelId: string, questions: Question[], source: "ai" | "teacher"): Promise<ActionResult<{ saved: number }>> {
  const result = await api<{ saved: number }>(subdomain, "/v1/questions", { method: "POST", body: { subjectId, levelId, questions, source } });
  return result.ok ? { ok: true, data: result.data } : fail(result);
}

export async function updateQuestion(subdomain: string, questionId: string, question: Question): Promise<ActionResult<null>> {
  const result = await api(subdomain, `/v1/questions/${id(questionId)}`, { method: "PUT", body: { question } });
  return result.ok ? { ok: true, data: null } : fail(result);
}

export async function deleteQuestion(subdomain: string, questionId: string): Promise<ActionResult<null>> {
  const result = await api(subdomain, `/v1/questions/${id(questionId)}`, { method: "DELETE" });
  return result.ok ? { ok: true, data: null } : fail(result);
}
