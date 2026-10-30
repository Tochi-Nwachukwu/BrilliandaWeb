"use server";

// The question bank and generating questions (batch 24; docs/data-contract.md). Teachers and admins.
import { generateRequestSchema, questionSchema, readNotesSchema, type Question } from "@brillianda/core/questions";
import { fieldErrorsOf } from "@brillianda/core/signup";
import { LIVE } from "../api/client";
import * as live from "../api/questions";
import * as fake from "../fake/questions";
import type { ActionResult, QuestionBankPage } from "../types";

// The API where it has endpoints (DATA_SOURCE=api), else sample data.
const impl = LIVE ? live : fake;

const CHECK = "Please check the highlighted fields.";

/** Draft questions from AI. Nothing is saved until the teacher saves them. */
export async function generateQuestions(school: string, input: unknown): Promise<ActionResult<{ questions: Question[]; usage: QuestionBankPage["usage"] }>> {
  const parsed = generateRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? CHECK, fieldErrors: fieldErrorsOf(parsed.error) };
  return impl.generateQuestions(String(school), parsed.data);
}

/** Reads photos and PDFs of lesson notes into text. Nothing is kept; the teacher checks the text before generating. */
export async function readNotes(school: string, input: unknown): Promise<ActionResult<{ text: string }>> {
  const parsed = readNotesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? CHECK };
  return impl.readNotes(String(school), parsed.data);
}

/** Saves questions to the bank, for one subject and class level. */
export async function saveQuestions(school: string, input: unknown): Promise<ActionResult<{ saved: number }>> {
  const raw = input as { subjectId?: unknown; levelId?: unknown; questions?: unknown; source?: unknown };
  const questions = Array.isArray(raw?.questions) ? raw.questions.map((q) => questionSchema.safeParse(q)) : [];
  const bad = questions.findIndex((q) => !q.success);
  if (!questions.length) return { ok: false, error: "There are no questions to save." };
  if (bad >= 0) return { ok: false, error: `Question ${bad + 1} needs fixing: ${questions[bad]!.error?.issues[0]?.message ?? "check it"}.` };
  return impl.saveQuestions(String(school), String(raw.subjectId ?? ""), String(raw.levelId ?? ""), questions.map((q) => q.data!), raw.source === "ai" ? "ai" : "teacher");
}

export async function updateQuestion(school: string, id: string, input: unknown): Promise<ActionResult<null>> {
  const parsed = questionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: CHECK, fieldErrors: fieldErrorsOf(parsed.error) };
  return impl.updateQuestion(String(school), String(id), parsed.data);
}

export async function deleteQuestion(school: string, id: string): Promise<ActionResult<null>> {
  return impl.deleteQuestion(String(school), String(id));
}
