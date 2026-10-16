import { describe, expect, it } from "vitest";
import { deadlineOf, newAccessCode, scaleTo, scoreAttempt, testSettingsSchema, windowState } from "./cbt";
import type { Question } from "./questions";

const base = { marks: 1, topic: "", difficulty: "easy" as const };
const QS: Question[] = [
  { type: "objective", text: "1/2 + 1/4?", options: ["2/6", "3/4"], answer: 1, ...base },
  { type: "trueFalse", text: "2/4 = 1/2", answer: true, ...base },
  { type: "fillGap", text: "Top number: ____", answers: ["numerator"], ...base, marks: 2 },
  { type: "theory", text: "Explain.", guide: "", ...base, marks: 5 },
];

describe("CBT", () => {
  it("scores the objective parts, waits for theory, then adds the teacher's mark", () => {
    const responses = { 0: { option: 1 }, 1: { value: false }, 2: { text: "Numerator" }, 3: { text: "Because…" } };
    expect(scoreAttempt(QS, responses, {})).toEqual({ auto: 3, theory: 0, total: 3, max: 9, toMark: 1 });
    expect(scoreAttempt(QS, responses, { 3: 4 })).toEqual({ auto: 3, theory: 4, total: 7, max: 9, toMark: 0 });
    // A theory question left blank has nothing to mark.
    expect(scoreAttempt(QS, { 0: { option: 1 } }, {}).toMark).toBe(0);
  });

  it("scales a test score into a score-sheet column", () => {
    expect(scaleTo(18, 25, 20)).toBe(14.4);
    expect(scaleTo(7, 9, 60)).toBe(46.67);
    expect(scaleTo(0, 0, 20)).toBe(0);
  });

  it("knows the window, and ends an attempt at its length or the close, whichever is first", () => {
    const w = { opensAt: "2026-10-16T08:00:00Z", closesAt: "2026-10-16T09:00:00Z" };
    expect(windowState(w, Date.parse("2026-10-16T07:59:00Z"))).toBe("before");
    expect(windowState(w, Date.parse("2026-10-16T08:30:00Z"))).toBe("open");
    expect(windowState(w, Date.parse("2026-10-16T09:00:00Z"))).toBe("closed");
    expect(deadlineOf(Date.parse("2026-10-16T08:00:00Z"), 40, w)).toBe(Date.parse("2026-10-16T08:40:00Z"));
    expect(deadlineOf(Date.parse("2026-10-16T08:45:00Z"), 40, w)).toBe(Date.parse("2026-10-16T09:00:00Z"));
  });

  it("checks the settings: a window at least as long as the test", () => {
    const ok = {
      title: "Fractions test",
      instructions: "",
      armIds: ["a"],
      questionIds: ["q"],
      durationMinutes: 30,
      opensAt: "2026-10-16T08:00:00Z",
      closesAt: "2026-10-16T09:00:00Z",
      where: "anywhere",
      shuffle: true,
      showScore: false,
      componentId: "ca1",
    };
    expect(testSettingsSchema.safeParse(ok).success).toBe(true);
    expect(testSettingsSchema.safeParse({ ...ok, closesAt: "2026-10-16T08:20:00Z" }).error?.issues[0]?.message).toBe("Leave at least the test’s length between opening and closing");
    expect(testSettingsSchema.safeParse({ ...ok, armIds: [] }).success).toBe(false);
  });

  it("makes codes without look-alike characters", () => {
    const code = newAccessCode();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });
});
