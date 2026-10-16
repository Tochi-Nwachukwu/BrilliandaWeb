// Computer-based tests (batch 25): a teacher sets a test from the question bank for classes, in a
// time window; students take it with a timer; objective answers mark themselves, the teacher marks
// theory, then sends the scores into a score-sheet column (user decisions, 15 Oct 2026).
import { z } from "zod";
import { markAnswer, type Question, type Response } from "./questions";

export const WHERE = ["anywhere", "school"] as const;
export type Where = (typeof WHERE)[number];
export const WHERE_LABEL: Record<Where, string> = { anywhere: "Anywhere (at home too)", school: "In school only, with a code" };

export const testSettingsSchema = z
  .object({
    title: z.string().trim().min(3, "Give the test a title").max(80, "Use at most 80 characters"),
    instructions: z.string().trim().max(500, "Use at most 500 characters"),
    armIds: z.array(z.string().min(1)).min(1, "Choose at least one class"),
    questionIds: z.array(z.string().min(1)).min(1, "Add at least one question").max(100, "Use at most 100 questions"),
    durationMinutes: z.coerce.number().int("Whole minutes").min(5, "At least 5 minutes").max(240, "At most 4 hours"),
    /** ISO date-times (the browser sends Lagos local times converted to UTC). */
    opensAt: z.string().min(1, "Choose when it opens"),
    closesAt: z.string().min(1, "Choose when it closes"),
    where: z.enum(WHERE),
    shuffle: z.boolean(),
    /** Show students their objective score as soon as they submit. */
    showScore: z.boolean(),
    /** The score-sheet part the scores go into when the teacher sends them (CA1, CA2, Exam). */
    componentId: z.string().min(1, "Choose where the scores go"),
  })
  .superRefine((t, ctx) => {
    const opens = Date.parse(t.opensAt);
    const closes = Date.parse(t.closesAt);
    if (Number.isNaN(opens)) ctx.addIssue({ code: "custom", path: ["opensAt"], message: "Choose when it opens" });
    if (Number.isNaN(closes)) ctx.addIssue({ code: "custom", path: ["closesAt"], message: "Choose when it closes" });
    else if (closes <= opens) ctx.addIssue({ code: "custom", path: ["closesAt"], message: "It closes after it opens" });
    else if (closes - opens < t.durationMinutes * 60_000) ctx.addIssue({ code: "custom", path: ["closesAt"], message: "Leave at least the test’s length between opening and closing" });
  });
export type TestSettings = z.infer<typeof testSettingsSchema>;

/** A six-character code the invigilator shows in the room (no 0/O or 1/I, which look alike). */
export function newAccessCode(random: () => number = Math.random): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => letters[Math.floor(random() * letters.length)]).join("");
}

export type Window = { opensAt: string; closesAt: string };

/** Whether a student may start now: before, open, or after the window. */
export function windowState(w: Window, now: number): "before" | "open" | "closed" {
  if (now < Date.parse(w.opensAt)) return "before";
  return now >= Date.parse(w.closesAt) ? "closed" : "open";
}

/** When an attempt must end: its length after starting, or the window's close, whichever is first. */
export function deadlineOf(startedAt: number, durationMinutes: number, w: Window): number {
  return Math.min(startedAt + durationMinutes * 60_000, Date.parse(w.closesAt));
}

/** Answers saved a little after the deadline still count (a slow connection); then nothing does. */
export const GRACE_MS = 30_000;

export type Scored = { auto: number; theory: number; total: number; max: number; toMark: number };

/**
 * An attempt's score: objective, true/false and gap answers marked automatically; theory from the
 * teacher's marks. `toMark` counts theory answers still waiting for a mark.
 */
export function scoreAttempt(questions: Question[], responses: Record<number, Response | undefined>, theoryMarks: Record<number, number | undefined>): Scored {
  let auto = 0;
  let theory = 0;
  let toMark = 0;
  let max = 0;
  questions.forEach((q, i) => {
    max += q.marks;
    const m = markAnswer(q, responses[i] ?? null);
    if (m !== null) auto += m;
    else if (theoryMarks[i] !== undefined) theory += theoryMarks[i]!;
    else if (responses[i]) toMark++;
  });
  const round = (n: number) => Math.round(n * 100) / 100;
  return { auto: round(auto), theory: round(theory), total: round(auto + theory), max: round(max), toMark };
}

/** A test score in a score-sheet column: 18 of 25 into CA1 (out of 20) is 14.4. Two decimals, as sheets allow. */
export function scaleTo(score: number, max: number, columnMax: number): number {
  if (max <= 0) return 0;
  return Math.round((score / max) * columnMax * 100) / 100;
}
