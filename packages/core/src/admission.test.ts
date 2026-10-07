import { describe, expect, it } from "vitest";
import { admissionPatternProblems, defaultAdmissionPattern, formatAdmissionNo, sameAdmissionNo } from "./admission";

describe("admission numbers", () => {
  it("fills in the year and the zero-padded number", () => {
    expect(formatAdmissionNo({ pattern: "SA/{YEAR}/{NUMBER}", digits: 3 }, 2026, 7)).toBe("SA/2026/007");
    expect(formatAdmissionNo({ pattern: "{NUMBER}", digits: 4 }, 2026, 12345)).toBe("12345");
    expect(formatAdmissionNo({ pattern: " GC-{NUMBER} ", digits: 2 }, 2026, 5)).toBe("GC-05");
  });

  it("explains what is wrong with a pattern", () => {
    expect(admissionPatternProblems({ pattern: "SA/{YEAR}/{NUMBER}", digits: 3 })).toEqual([]);
    expect(admissionPatternProblems({ pattern: "SA/{YEAR}", digits: 3 })).toEqual(["Include {NUMBER}, so every student gets a different number."]);
    expect(admissionPatternProblems({ pattern: "{NUMBER}-{NUMBER}", digits: 3 })).toContain("Use {NUMBER} only once.");
    expect(admissionPatternProblems({ pattern: "{CLASS}/{NUMBER}", digits: 3 })).toContain("Only {YEAR} and {NUMBER} can go in braces.");
    expect(admissionPatternProblems({ pattern: "{NUMBER}", digits: 0 })).toContain("Digits must be from 1 to 6.");
  });

  it("starts from the school's initials", () => {
    expect(defaultAdmissionPattern("Sunrise Academy")).toBe("SA/{YEAR}/{NUMBER}");
    expect(defaultAdmissionPattern("  ")).toBe("ADM/{YEAR}/{NUMBER}");
  });

  it("compares numbers without case or spaces", () => {
    expect(sameAdmissionNo(" sa/2026/001", "SA/2026/001 ")).toBe(true);
    expect(sameAdmissionNo("SA/2026/001", "SA/2026/002")).toBe(false);
  });
});
