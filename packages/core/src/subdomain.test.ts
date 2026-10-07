import { describe, expect, it } from "vitest";
import { alternativeSubdomains, normaliseSubdomain, subdomainProblem, suggestSubdomains } from "./subdomain";

describe("subdomainProblem", () => {
  it("accepts a plain name, digits and single hyphens", () => {
    for (const name of ["surebloom", "abc", "royal-heights", "school2", "a".repeat(30)]) {
      expect(subdomainProblem(name), name).toBeNull();
    }
  });

  it("checks the length", () => {
    expect(subdomainProblem("ab")?.message).toMatch(/at least 3/);
    expect(subdomainProblem("a".repeat(31))?.message).toMatch(/at most 30/);
  });

  it("checks the characters", () => {
    expect(subdomainProblem("Surebloom")?.reason).toBe("invalid");
    expect(subdomainProblem("sure_bloom")?.reason).toBe("invalid");
    expect(subdomainProblem("sure.bloom")?.reason).toBe("invalid");
  });

  it("must start with a letter and not end with a hyphen", () => {
    expect(subdomainProblem("2school")?.message).toBe("Start with a letter");
    expect(subdomainProblem("-school")?.message).toBe("Start with a letter");
    expect(subdomainProblem("school-")?.message).toBe("Don’t end with a hyphen");
  });

  it("allows only one hyphen at a time", () => {
    expect(subdomainProblem("royal--heights")?.message).toBe("Use one hyphen at a time");
  });

  it("blocks the platform's names and exam bodies", () => {
    for (const name of ["www", "app", "api", "admin", "auth", "mail", "status", "help", "docs", "blog", "cdn", "staging", "waec", "neco", "jamb", "ubec"]) {
      expect(subdomainProblem(name)?.reason, name).toBe("reserved");
    }
  });
});

describe("normaliseSubdomain", () => {
  it("lowers the case and drops spaces", () => {
    expect(normaliseSubdomain("  Sure Bloom ")).toBe("surebloom");
  });
});

describe("suggestSubdomains", () => {
  it("follows the plan's example", () => {
    expect(suggestSubdomains("Surebloom School").slice(0, 3)).toEqual(["surebloom", "surebloomschool", "surebloom-school"]);
  });

  it("drops punctuation and accents", () => {
    expect(suggestSubdomains("St. Mary’s Café College")[0]).toBe("stmaryscafe");
  });

  it("offers initials for a long name", () => {
    expect(suggestSubdomains("Royal Heights International College")).toContain("rhic");
  });

  it("only offers names that can be used", () => {
    expect(suggestSubdomains("The School")).toEqual(["theschool", "the-school"]);
    expect(suggestSubdomains("123 Academy").every((s) => /^[a-z]/.test(s))).toBe(true);
    for (const s of suggestSubdomains("A very long school name that keeps going on and on")) expect(s.length).toBeLessThanOrEqual(30);
  });
});

describe("alternativeSubdomains", () => {
  it("adds the state, school and a number", () => {
    expect(alternativeSubdomains("greenfield", "Lagos")).toEqual(["greenfield-lagos", "greenfieldlagos", "greenfieldschool", "greenfield-school", "greenfield2", "greenfield-2"]);
  });

  it("works without a state and never offers the taken name", () => {
    const list = alternativeSubdomains("greenfield");
    expect(list).not.toContain("greenfield");
    expect(list[0]).toBe("greenfieldschool");
  });
});
