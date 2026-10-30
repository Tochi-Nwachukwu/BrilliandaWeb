// Questions for tests, assignments and exams (CBT and printed papers). The one shape shared by the
// question bank, the AI generator (docs/ai-integration.md, Step 5) and marking.
import { z } from "zod";

export const QUESTION_TYPES = ["objective", "trueFalse", "fillGap", "theory"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];
export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  objective: "Objective",
  trueFalse: "True or false",
  fillGap: "Fill in the gap",
  theory: "Theory",
};

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

const text = (max: number, empty: string) => z.string().trim().min(1, empty).max(max, `Use at most ${max} characters`);
const common = {
  text: text(1000, "Write the question"),
  marks: z.coerce.number().min(0.5, "At least half a mark").max(50, "At most 50 marks"),
  topic: z.string().trim().max(80, "Use at most 80 characters"),
  difficulty: z.enum(DIFFICULTIES),
};

export const questionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("objective"),
    ...common,
    options: z.array(text(300, "Fill in this option")).min(2, "At least two options").max(5, "At most five options"),
    /** The right option, by position. */
    answer: z.coerce.number().int().min(0),
  }),
  z.object({ type: z.literal("trueFalse"), ...common, answer: z.boolean() }),
  z.object({
    type: z.literal("fillGap"),
    ...common,
    /** Every answer accepted, e.g. ["photosynthesis"]; case and spacing don't matter. */
    answers: z.array(text(120, "Write an accepted answer")).min(1, "At least one accepted answer").max(5),
  }),
  z.object({
    type: z.literal("theory"),
    ...common,
    /** What a full answer includes, for the teacher marking it. */
    guide: z.string().trim().max(2000, "Use at most 2,000 characters"),
  }),
]).superRefine((q, ctx) => {
  if (q.type === "objective" && q.answer >= q.options.length) ctx.addIssue({ code: "custom", path: ["answer"], message: "Choose the right option" });
});
export type Question = z.infer<typeof questionSchema>;

/** Option letters: A, B, C, D, E. */
export const optionLetter = (i: number) => String.fromCharCode(65 + i);

const tidy = (s: string) => s.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ").replace(/[.]$/, "");

/** A student's response to one question: an option, true/false, words, or an essay. */
export type Response = { option: number } | { value: boolean } | { text: string };

/**
 * Marks for an answer, or null when a teacher must mark it (theory). Objective, true/false and
 * fill-in-the-gap are all or nothing; no answer scores 0.
 */
export function markAnswer(q: Question, response: Response | null): number | null {
  if (q.type === "theory") return null;
  if (!response) return 0;
  if (q.type === "objective") return "option" in response && response.option === q.answer ? q.marks : 0;
  if (q.type === "trueFalse") return "value" in response && response.value === q.answer ? q.marks : 0;
  return "text" in response && q.answers.some((a) => tidy(a) === tidy(response.text)) ? q.marks : 0;
}

/** Total marks of a set of questions. */
export const totalMarks = (qs: Pick<Question, "marks">[]) => qs.reduce((n, q) => n + q.marks, 0);

/**
 * The same order every time for the same seed (a student and a test), different between students:
 * so a refresh doesn't reshuffle, and neighbours don't see the same order.
 */
export function seededOrder(length: number, seed: string): number[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const next = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
  const order = Array.from({ length }, (_, i) => i);
  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}

// ——— Asking for questions (the AI generator) ———

export const PURPOSES = ["test", "assignment", "exam"] as const;
export type Purpose = (typeof PURPOSES)[number];

/** Lesson notes a teacher gives the generator: pasted, read from a Word or text file, or read from photos and PDFs. */
export const NOTES_MAX = 20_000;
/** Photos or PDFs read into notes in one go, and their total size as data URLs (a request stays under Vercel's 4.5 MB). */
export const NOTE_FILES_MAX = 5;
export const NOTE_FILES_CHARS = 3_800_000;

export const readNotesSchema = z
  .object({
    files: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(200),
          dataUrl: z.string().regex(/^data:(image\/(jpeg|png|webp)|application\/pdf);base64,[A-Za-z0-9+/=]+$/, "That file can’t be read. Use a photo (JPG or PNG) or a PDF"),
        }),
      )
      .min(1, "Add a photo or a PDF")
      .max(NOTE_FILES_MAX, `Add up to ${NOTE_FILES_MAX} files at a time`),
  })
  .refine((r) => r.files.reduce((n, f) => n + f.dataUrl.length, 0) <= NOTE_FILES_CHARS, { path: ["files"], message: "Those files are too big together. Add fewer, or smaller ones" });
export type ReadNotesRequest = z.infer<typeof readNotesSchema>;

export const generateRequestSchema = z
  .object({
    purpose: z.enum(PURPOSES),
    subjectId: z.string().min(1, "Choose a subject"),
    levelId: z.string().min(1, "Choose a class"),
    topics: z.array(z.string().trim().min(2).max(80)).min(1, "Add at least one topic").max(10, "Use at most 10 topics"),
    notes: z.string().trim().max(NOTES_MAX, `Use at most ${NOTES_MAX.toLocaleString("en-GB")} characters`),
    counts: z.object({
      objective: z.coerce.number().int().min(0).max(50),
      trueFalse: z.coerce.number().int().min(0).max(20),
      fillGap: z.coerce.number().int().min(0).max(20),
      theory: z.coerce.number().int().min(0).max(10),
    }),
    difficulty: z.enum(["easy", "medium", "hard", "mixed"]),
  })
  .superRefine((r, ctx) => {
    const n = r.counts.objective + r.counts.trueFalse + r.counts.fillGap + r.counts.theory;
    if (n < 1) ctx.addIssue({ code: "custom", path: ["counts"], message: "Ask for at least one question" });
    if (n > 60) ctx.addIssue({ code: "custom", path: ["counts"], message: "Ask for at most 60 questions at a time" });
  });
export type GenerateRequest = z.infer<typeof generateRequestSchema>;

/** A school's AI allowance each month (docs/ai-integration.md, Step 8). */
export const MONTHLY_GENERATIONS = 300;
