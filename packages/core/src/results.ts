// Results (after v1, group 2): the school's score parts, its grading scale, and how a class's
// averages and positions are worked out. Builds on grading.ts (totals, grades, ranks), which came
// from the first app with its decisions (D-1 to D-3, F-1, F-32).
import { z } from "zod";
import { computeSubjectTotal, rankScores, roundScore, type CellValue, type GradeBand, type RankMode, type WeightedComponent } from "./grading";

/** One part of a score sheet: CA1, CA2, Exam. Its weight is its maximum, and the parts add up to 100. */
export type ScoreComponent = { id: string; name: string; maxScore: number };

/** User decision (14 Oct 2026): CA1 20, CA2 20, Exam 60 by default; each school can change it. */
export const DEFAULT_COMPONENTS: ScoreComponent[] = [
  { id: "ca1", name: "CA1", maxScore: 20 },
  { id: "ca2", name: "CA2", maxScore: 20 },
  { id: "exam", name: "Exam", maxScore: 60 },
];

/** User decision (14 Oct 2026): A to F by default. Thresholds, not ranges (F-1): a band at 0 is required. */
export const DEFAULT_SCALE: GradeBand[] = [
  { minScore: 70, grade: "A", remark: "Excellent", isPass: true },
  { minScore: 60, grade: "B", remark: "Very good", isPass: true },
  { minScore: 50, grade: "C", remark: "Good", isPass: true },
  { minScore: 45, grade: "D", remark: "Fair", isPass: true },
  { minScore: 40, grade: "E", remark: "Pass", isPass: true },
  { minScore: 0, grade: "F", remark: "Fail", isPass: false },
];

/** WAEC style, offered as a preset in Results settings. */
export const WAEC_SCALE: GradeBand[] = [
  { minScore: 75, grade: "A1", remark: "Excellent", isPass: true },
  { minScore: 70, grade: "B2", remark: "Very good", isPass: true },
  { minScore: 65, grade: "B3", remark: "Good", isPass: true },
  { minScore: 60, grade: "C4", remark: "Credit", isPass: true },
  { minScore: 55, grade: "C5", remark: "Credit", isPass: true },
  { minScore: 50, grade: "C6", remark: "Credit", isPass: true },
  { minScore: 45, grade: "D7", remark: "Pass", isPass: true },
  { minScore: 40, grade: "E8", remark: "Pass", isPass: true },
  { minScore: 0, grade: "F9", remark: "Fail", isPass: false },
];

export const asWeighted = (components: ScoreComponent[]): WeightedComponent[] => components.map((c) => ({ id: c.id, weight: c.maxScore, maxScore: c.maxScore }));

export const resultsSettingsSchema = z
  .object({
    components: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string().trim().min(1, "Name this part").max(20, "Use at most 20 characters"),
          maxScore: z.coerce.number().int("Use a whole number").min(1, "At least 1").max(100, "At most 100"),
        }),
      )
      .min(1, "Keep at least one part")
      .max(8, "Use at most 8 parts"),
    scale: z
      .array(
        z.object({
          minScore: z.coerce.number().min(0, "0 or more").max(100, "100 or less"),
          grade: z.string().trim().min(1, "Give a grade").max(4, "Use at most 4 characters"),
          remark: z.string().trim().max(30, "Use at most 30 characters"),
          isPass: z.boolean(),
        }),
      )
      .min(2, "Use at least two grades")
      .max(12, "Use at most 12 grades"),
    showPositions: z.boolean(),
  })
  .superRefine((s, ctx) => {
    const total = s.components.reduce((n, c) => n + c.maxScore, 0);
    if (total !== 100) ctx.addIssue({ code: "custom", path: ["components"], message: `The parts add up to ${total}. Make them add up to 100.` });
    const names = new Set<string>();
    s.components.forEach((c, i) => {
      const key = c.name.toLowerCase();
      if (names.has(key)) ctx.addIssue({ code: "custom", path: ["components", i, "name"], message: "Two parts can’t share a name" });
      names.add(key);
    });
    if (!s.scale.some((b) => b.minScore === 0)) ctx.addIssue({ code: "custom", path: ["scale"], message: "Add a grade that starts at 0, so every score gets one." });
    const mins = new Set<number>();
    const grades = new Set<string>();
    s.scale.forEach((b, i) => {
      if (mins.has(b.minScore)) ctx.addIssue({ code: "custom", path: ["scale", i, "minScore"], message: "Two grades can’t start at the same score" });
      if (grades.has(b.grade.toUpperCase())) ctx.addIssue({ code: "custom", path: ["scale", i, "grade"], message: "Two bands can’t share a grade" });
      mins.add(b.minScore);
      grades.add(b.grade.toUpperCase());
    });
  });
export type ResultsSettings = z.infer<typeof resultsSettingsSchema>;

export const unlockRequestSchema = z.object({ reason: z.string().trim().min(5, "Say what needs changing").max(200, "Use at most 200 characters") });

/** One student's row on a sheet. `excluded` is an elective the student doesn't take. */
export type SheetRow = { studentId: string; excluded: boolean; scores: Partial<Record<string, CellValue>> };

/** How far a sheet has got: rows with every part entered, out of the students who take the subject. */
export function sheetProgress(rows: SheetRow[], components: ScoreComponent[]): { complete: number; of: number } {
  const taking = rows.filter((r) => !r.excluded);
  const complete = taking.filter((r) => components.every((c) => r.scores[c.id])).length;
  return { complete, of: taking.length };
}

/** A student's total on one sheet, or null while any part is empty. */
export function rowTotal(row: SheetRow, components: ScoreComponent[]): number | null {
  const { total, complete } = computeSubjectTotal(asWeighted(components), row.scores);
  return complete ? total : null;
}

/**
 * A class's results: each student's average over the subjects they take (complete totals only)
 * and their position in the arm (D-1), ties ranked 1, 2, 2, 4 by default (D-2).
 */
export function classResults(
  students: string[],
  totals: { studentId: string; subjectId: string; total: number }[],
  mode: RankMode = "COMPETITION",
): Map<string, { average: number | null; subjects: number; position: number | null }> {
  const out = new Map<string, { average: number | null; subjects: number; position: number | null }>();
  const ranked: { id: string; total: number }[] = [];
  for (const id of students) {
    const mine = totals.filter((t) => t.studentId === id);
    const average = mine.length ? roundScore(mine.reduce((n, t) => n + t.total, 0) / mine.length) : null;
    out.set(id, { average, subjects: mine.length, position: null });
    if (average !== null) ranked.push({ id, total: average });
  }
  for (const [id, position] of rankScores(ranked, mode)) out.get(id)!.position = position;
  return out;
}
