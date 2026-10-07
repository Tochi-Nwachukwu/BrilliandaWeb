import { describe, expect, it } from "vitest";
import { defaultTerms, sessionSchema, termPosition, termWeeks } from "./calendar";

describe("defaultTerms", () => {
  it("follows the Lagos pattern for 2026/2027, Monday to Friday", () => {
    expect(defaultTerms(2026)).toEqual([
      { name: "First Term", startsOn: "2026-09-14", endsOn: "2026-12-18" },
      { name: "Second Term", startsOn: "2027-01-04", endsOn: "2027-04-09" },
      { name: "Third Term", startsOn: "2027-05-03", endsOn: "2027-07-23" },
    ]);
  });

  it("starts each term on a Monday and ends it on a Friday, every year", () => {
    for (let year = 2024; year <= 2032; year++) {
      for (const term of [...defaultTerms(year), ...defaultTerms(year, 2)]) {
        expect(new Date(term.startsOn).getUTCDay(), `${year} ${term.name} start`).toBe(1);
        expect(new Date(term.endsOn).getUTCDay(), `${year} ${term.name} end`).toBe(5);
      }
    }
  });

  it("offers two terms and British names", () => {
    expect(defaultTerms(2026, 2).map((t) => t.name)).toEqual(["First Term", "Second Term"]);
    expect(defaultTerms(2026, 3, "british").map((t) => t.name)).toEqual(["Autumn Term", "Spring Term", "Summer Term"]);
  });

  it("gives terms that pass the schema", () => {
    expect(sessionSchema.safeParse({ startYear: 2026, terms: defaultTerms(2026) }).success).toBe(true);
    expect(sessionSchema.safeParse({ startYear: 2026, terms: defaultTerms(2026, 2) }).success).toBe(true);
  });
});

describe("sessionSchema", () => {
  const terms = defaultTerms(2026);
  const issues = (input: unknown) => (sessionSchema.safeParse(input).error?.issues ?? []).map((i) => `${i.path.join(".")}: ${i.message}`);

  it("needs each term to end after it starts", () => {
    expect(issues({ startYear: 2026, terms: [{ ...terms[0], endsOn: "2026-09-01" }, terms[1], terms[2]] })).toContain("terms.0.endsOn: Ends after it starts");
  });

  it("keeps the terms in order without overlapping", () => {
    expect(issues({ startYear: 2026, terms: [terms[0], { ...terms[1], startsOn: "2026-12-01" }, terms[2]] })).toContain("terms.1.startsOn: Starts after First Term ends");
  });

  it("starts the session in its own year", () => {
    expect(issues({ startYear: 2027, terms })).toContain("terms.0.startsOn: The 2027/2028 session starts in 2027");
  });

  it("needs names, different ones, and two or three terms", () => {
    expect(issues({ startYear: 2026, terms: [{ ...terms[0], name: " " }, terms[1], terms[2]] })).toContain("terms.0.name: Give the term a name");
    expect(issues({ startYear: 2026, terms: [terms[0], { ...terms[1], name: "first term" }, terms[2]] })).toContain("terms.1.name: Two terms can’t share a name");
    expect(sessionSchema.safeParse({ startYear: 2026, terms: [terms[0]] }).success).toBe(false);
  });
});

describe("termPosition", () => {
  const terms = defaultTerms(2026);

  it("finds the term and week", () => {
    expect(termPosition(terms, "2026-10-07")).toEqual({ kind: "in-term", index: 0, week: 4, weeks: 14 });
    expect(termPosition(terms, "2026-09-14")).toMatchObject({ kind: "in-term", index: 0, week: 1 });
  });

  it("knows the holidays and the edges of the session", () => {
    expect(termPosition(terms, "2026-12-25")).toEqual({ kind: "break", nextIndex: 1 });
    expect(termPosition(terms, "2026-08-30")).toEqual({ kind: "before" });
    expect(termPosition(terms, "2027-08-15")).toEqual({ kind: "after" });
  });

  it("counts weeks", () => {
    expect(termWeeks(terms[0]!)).toBe(14);
  });
});
