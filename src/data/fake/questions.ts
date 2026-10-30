// FAKE: the question bank and generating questions (batch 24) on sample data. The backend replaces
// the bank with stored questions, and the generator with an AI call (docs/ai-integration.md). A
// teacher works in the subjects and class levels they teach; owners and admins in all of them.
import "server-only";
import { MONTHLY_GENERATIONS, type GenerateRequest, type Question } from "@brillianda/core/questions";
import type { ActionResult, QuestionBankPage } from "../types";
import { requireStaff } from "./auth";
import { recordChange } from "./changes";
import { fakeQuestions } from "./generator";
import { store } from "./store";

const pause = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));
const month = () => new Date().toISOString().slice(0, 7);
const usageKey = (subdomain: string) => `${subdomain}|${month()}`;

function usageOf(subdomain: string) {
  const now = new Date();
  const resetsOn = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString().slice(0, 10);
  return { used: store.aiUsage.get(usageKey(subdomain)) ?? 0, limit: MONTHLY_GENERATIONS, resetsOn };
}

/** The subject and class level pairs a person may write for. */
export function pairsFor(subdomain: string, userId: string, admin: boolean) {
  const levels = store.levels.filter((l) => l.subdomain === subdomain && !l.archived).sort((a, b) => a.position - b.position);
  const subjects = store.subjects.filter((s) => s.subdomain === subdomain);
  const all = store.subjectLinks
    .filter((l) => l.subdomain === subdomain)
    .map((l) => ({ subjectId: l.subjectId, levelId: l.levelId }))
    .filter((p) => subjects.some((s) => s.id === p.subjectId) && levels.some((l) => l.id === p.levelId));
  const mine = admin
    ? all
    : store.subjectTeachers
        .filter((t) => t.userId === userId)
        .map((t) => ({ subjectId: t.subjectId, levelId: store.arms.find((a) => a.id === t.armId)?.levelId ?? "" }))
        .filter((p) => p.levelId);
  const seen = new Set<string>();
  return mine
    .filter((p) => !seen.has(`${p.subjectId}|${p.levelId}`) && seen.add(`${p.subjectId}|${p.levelId}`))
    .map((p) => ({
      ...p,
      subjectName: subjects.find((s) => s.id === p.subjectId)?.name ?? "",
      levelName: levels.find((l) => l.id === p.levelId)?.name ?? "",
      levelPosition: levels.find((l) => l.id === p.levelId)?.position ?? 0,
    }))
    .sort((a, b) => a.levelPosition - b.levelPosition || a.subjectName.localeCompare(b.subjectName))
    .map((p) => ({ subjectId: p.subjectId, subjectName: p.subjectName, levelId: p.levelId, levelName: p.levelName }));
}

async function who(subdomain: string) {
  const staff = await requireStaff(subdomain);
  if (!staff) return null;
  const admin = staff.role === "owner" || staff.role === "admin";
  return { user: staff.user, admin, pairs: pairsFor(subdomain, staff.user.id, admin) };
}

const allowed = (pairs: { subjectId: string; levelId: string }[], subjectId: string, levelId: string) => pairs.some((p) => p.subjectId === subjectId && p.levelId === levelId);

export async function getQuestionBank(subdomain: string): Promise<QuestionBankPage | null> {
  const me = await who(subdomain);
  if (!me) return null;
  return {
    pairs: me.pairs,
    questions: store.questionBank
      .filter((q) => q.subdomain === subdomain && allowed(me.pairs, q.subjectId, q.levelId))
      .sort((a, b) => b.at - a.at)
      .map((q) => ({ id: q.id, subjectId: q.subjectId, levelId: q.levelId, question: q.question, source: q.source, by: q.by, byMe: q.byId === me.user.id, at: q.at })),
    usage: usageOf(subdomain),
    canEditAll: me.admin,
  };
}

/** Draft questions from the (fake) AI. Nothing is saved: the teacher checks them first. */
export async function generateQuestions(subdomain: string, req: GenerateRequest): Promise<ActionResult<{ questions: Question[]; usage: QuestionBankPage["usage"] }>> {
  const me = await who(subdomain);
  if (!me) return { ok: false, error: "Sign in as a teacher to do this." };
  if (!allowed(me.pairs, req.subjectId, req.levelId)) return { ok: false, error: "You can only write questions for the subjects and classes you teach." };
  const usage = usageOf(subdomain);
  if (usage.used >= usage.limit) return { ok: false, error: `Your school has used this month’s ${usage.limit} question generations. They reset on ${usage.resetsOn}.` };
  // Generating takes a while for real (10 to 40 seconds); a short wait here keeps the screens honest.
  await pause(2500);
  const pair = me.pairs.find((p) => p.subjectId === req.subjectId && p.levelId === req.levelId)!;
  store.aiUsage.set(usageKey(subdomain), usage.used + 1);
  return { ok: true, data: { questions: fakeQuestions(req, pair.subjectName, pair.levelName, usage.used), usage: usageOf(subdomain) } };
}

/** Sample reading of photos and PDFs of lesson notes: the real one is the model's, on the API. */
export async function readNotes(subdomain: string, input: { files: { name: string; dataUrl: string }[] }): Promise<ActionResult<{ text: string }>> {
  const me = await who(subdomain);
  if (!me) return { ok: false, error: "Sign in as a teacher to do this." };
  await pause(1800);
  return {
    ok: true,
    data: {
      text: `(Sample text: the real reading of ${input.files.length === 1 ? "this file" : `these ${input.files.length} files`} comes from AI once the backend connects it.)
Photosynthesis is the process by which green plants make their own food. They take in carbon dioxide from the air and water from the soil. Using sunlight and chlorophyll, they make glucose and give out oxygen.`,
    },
  };
}

/** Saves checked questions to the bank. */
export async function saveQuestions(subdomain: string, subjectId: string, levelId: string, questions: Question[], source: "ai" | "teacher"): Promise<ActionResult<{ saved: number }>> {
  await pause();
  const me = await who(subdomain);
  if (!me) return { ok: false, error: "Sign in as a teacher to do this." };
  if (!allowed(me.pairs, subjectId, levelId)) return { ok: false, error: "You can only write questions for the subjects and classes you teach." };
  for (const question of questions) {
    store.questionBank.push({ id: crypto.randomUUID(), subdomain, subjectId, levelId, question, source, byId: me.user.id, by: me.user.fullName, at: Date.now() });
  }
  const pair = me.pairs.find((p) => p.subjectId === subjectId && p.levelId === levelId)!;
  recordChange(subdomain, me.user.fullName, `Added ${questions.length === 1 ? "1 question" : `${questions.length} questions`} to the ${pair.levelName} ${pair.subjectName} question bank`);
  return { ok: true, data: { saved: questions.length } };
}

function ownQuestion(subdomain: string, id: string, me: NonNullable<Awaited<ReturnType<typeof who>>>) {
  const q = store.questionBank.find((x) => x.subdomain === subdomain && x.id === id);
  if (!q) return { error: "That question isn’t in the bank any more." } as const;
  if (!me.admin && q.byId !== me.user.id) return { error: "You can change your own questions only. Ask an admin to change this one." } as const;
  return { q } as const;
}

export async function updateQuestion(subdomain: string, id: string, question: Question): Promise<ActionResult<null>> {
  await pause();
  const me = await who(subdomain);
  if (!me) return { ok: false, error: "Sign in as a teacher to do this." };
  const found = ownQuestion(subdomain, id, me);
  if ("error" in found) return { ok: false, error: found.error! };
  found.q.question = question;
  found.q.at = Date.now();
  return { ok: true, data: null };
}

export async function deleteQuestion(subdomain: string, id: string): Promise<ActionResult<null>> {
  await pause();
  const me = await who(subdomain);
  if (!me) return { ok: false, error: "Sign in as a teacher to do this." };
  const found = ownQuestion(subdomain, id, me);
  if ("error" in found) return { ok: false, error: found.error! };
  store.questionBank = store.questionBank.filter((x) => x !== found.q);
  return { ok: true, data: null };
}
