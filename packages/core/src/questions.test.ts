import { describe, expect, it } from "vitest";
import { generateRequestSchema, markAnswer, questionSchema, seededOrder, totalMarks, type Question } from "./questions";

const base = { marks: 1, topic: "Plants", difficulty: "easy" as const };
const objective: Question = { type: "objective", text: "Plants make food by…", options: ["respiration", "photosynthesis", "digestion"], answer: 1, ...base };
const gap: Question = { type: "fillGap", text: "Green plants contain ____.", answers: ["chlorophyll"], ...base, marks: 2 };
const essay: Question = { type: "theory", text: "Explain photosynthesis.", guide: "Light, water, carbon dioxide", ...base, marks: 10 };

describe("questions", () => {
  it("marks objective, true/false and gaps; leaves theory for the teacher", () => {
    expect(markAnswer(objective, { option: 1 })).toBe(1);
    expect(markAnswer(objective, { option: 0 })).toBe(0);
    expect(markAnswer(objective, null)).toBe(0);
    expect(markAnswer({ type: "trueFalse", text: "The sun is a star.", answer: true, ...base }, { value: true })).toBe(1);
    expect(markAnswer(gap, { text: "  Chlorophyll. " })).toBe(2);
    expect(markAnswer(gap, { text: "chloroplast" })).toBe(0);
    expect(markAnswer(essay, { text: "Plants use light…" })).toBeNull();
    expect(totalMarks([objective, gap, essay])).toBe(13);
  });

  it("checks a question: the right option must exist", () => {
    expect(questionSchema.safeParse(objective).success).toBe(true);
    expect(questionSchema.safeParse({ ...objective, answer: 3 }).error?.issues[0]?.message).toBe("Choose the right option");
    expect(questionSchema.safeParse({ ...objective, options: ["only one"] }).success).toBe(false);
  });

  it("shuffles the same way for the same seed, and differently for another", () => {
    const a = seededOrder(10, "test1:st1");
    expect(seededOrder(10, "test1:st1")).toEqual(a);
    expect([...a].sort((x, y) => x - y)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(seededOrder(10, "test1:st2")).not.toEqual(a);
  });

  it("asks for between 1 and 60 questions", () => {
    const ask = { purpose: "test", subjectId: "m", levelId: "gl1", topics: ["Fractions"], notes: "", difficulty: "mixed" };
    expect(generateRequestSchema.safeParse({ ...ask, counts: { objective: 0, trueFalse: 0, fillGap: 0, theory: 0 } }).success).toBe(false);
    expect(generateRequestSchema.safeParse({ ...ask, counts: { objective: 20, trueFalse: 0, fillGap: 0, theory: 5 } }).success).toBe(true);
  });
});
