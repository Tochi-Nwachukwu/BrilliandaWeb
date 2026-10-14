import { describe, expect, it } from "vitest";
import { resolveGrade } from "./grading";
import { classResults, DEFAULT_COMPONENTS, DEFAULT_SCALE, resultsSettingsSchema, rowTotal, sheetProgress, WAEC_SCALE } from "./results";

const settings = { components: DEFAULT_COMPONENTS, scale: DEFAULT_SCALE, showPositions: true };

describe("defaults", () => {
  it("add up to 100 and give every score a grade", () => {
    expect(resultsSettingsSchema.safeParse(settings).success).toBe(true);
    expect(resultsSettingsSchema.safeParse({ ...settings, scale: WAEC_SCALE }).success).toBe(true);
    expect(resolveGrade(69.99, DEFAULT_SCALE).grade).toBe("B");
    expect(resolveGrade(0, DEFAULT_SCALE).grade).toBe("F");
  });
});

describe("resultsSettingsSchema", () => {
  it("needs parts that add up to 100", () => {
    const result = resultsSettingsSchema.safeParse({ ...settings, components: [{ id: "a", name: "CA", maxScore: 30 }, { id: "b", name: "Exam", maxScore: 60 }] });
    expect(result.error?.issues[0]?.message).toBe("The parts add up to 90. Make them add up to 100.");
  });
  it("needs a grade from 0, and no repeats", () => {
    expect(resultsSettingsSchema.safeParse({ ...settings, scale: DEFAULT_SCALE.slice(0, -1) }).success).toBe(false);
    const repeated = resultsSettingsSchema.safeParse({ ...settings, scale: [...DEFAULT_SCALE, { minScore: 80, grade: "a", remark: "", isPass: true }] });
    expect(repeated.error?.issues.map((i) => i.message)).toContain("Two bands can’t share a grade");
  });
});

describe("sheets and class results", () => {
  const full = { studentId: "s1", excluded: false, scores: { ca1: { value: 15, isAbsent: false }, ca2: { value: 18, isAbsent: false }, exam: { value: 42, isAbsent: false } } };
  const partial = { studentId: "s2", excluded: false, scores: { ca1: { value: 10, isAbsent: false } } };
  const elective = { studentId: "s3", excluded: true, scores: {} };

  it("counts only students who take the subject", () => {
    expect(sheetProgress([full, partial, elective], DEFAULT_COMPONENTS)).toEqual({ complete: 1, of: 2 });
  });
  it("totals a complete row, and nothing for a partial one", () => {
    expect(rowTotal(full, DEFAULT_COMPONENTS)).toBe(75);
    expect(rowTotal(partial, DEFAULT_COMPONENTS)).toBeNull();
  });
  it("averages over each student's subjects and ranks within the arm, ties shared", () => {
    const results = classResults(
      ["a", "b", "c", "d"],
      [
        { studentId: "a", subjectId: "m", total: 80 },
        { studentId: "a", subjectId: "e", total: 60 },
        { studentId: "b", subjectId: "m", total: 70 },
        { studentId: "c", subjectId: "m", total: 70 },
      ],
    );
    expect(results.get("a")).toEqual({ average: 70, subjects: 2, position: 1 });
    expect(results.get("b")?.position).toBe(1);
    expect(results.get("c")?.position).toBe(1);
    expect(results.get("d")).toEqual({ average: null, subjects: 0, position: null });
  });
});
