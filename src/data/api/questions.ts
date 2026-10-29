// The question bank, on the Brillianda API. Same functions and shapes as ../fake/questions.ts.
import "server-only";
import type { GenerateRequest, Question } from "@brillianda/core/questions";
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
