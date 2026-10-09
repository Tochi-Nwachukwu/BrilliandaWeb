import { describe, expect, it } from "vitest";
import { addSubjectsSchema, bandOf, defaultLink, defaultLinks, preTicked, subjectCode, type CatalogueEntry } from "./subjects";

const CATALOGUE: CatalogueEntry[] = [
  { id: "english-studies", name: "English Studies", code: "ENG", tag: "nerdc2025", offers: [{ band: "lowerPrimary", role: "core" }, { band: "junior", role: "core" }] },
  { id: "yoruba", name: "Yoruba", code: "YOR", tag: "nerdc2025", set: "Nigerian language", offers: [{ band: "junior", role: "choice" }, { band: "senior", role: "humanities" }] },
  { id: "french", name: "French", code: "FRE", tag: "nerdc2025", offers: [{ band: "junior", role: "optional" }, { band: "senior", role: "humanities" }] },
  { id: "biology", name: "Biology", code: "BIO", tag: "nerdc2025", offers: [{ band: "senior", role: "science" }] },
  { id: "civic-education", name: "Civic Education", code: "CIV", tag: "legacy", offers: [{ band: "senior", role: "core" }] },
];

describe("bandOf", () => {
  it("splits primary at 4 and leaves pre-school out", () => {
    expect(bandOf("primary3", "primary")).toBe("lowerPrimary");
    expect(bandOf("primary4", "primary")).toBe("upperPrimary");
    expect(bandOf("jss2", "junior")).toBe("junior");
    expect(bandOf("ss1", "senior")).toBe("senior");
    expect(bandOf("nursery1", "preschool")).toBeNull();
  });

  it("places a custom class by its section", () => {
    expect(bandOf(null, "junior")).toBe("junior");
    expect(bandOf(null, "primary")).toBeNull();
  });
});

describe("preTicked", () => {
  it("ticks the 2025 subjects of the school's bands, not optional or legacy ones", () => {
    expect(preTicked(CATALOGUE, ["junior"])).toEqual(["english-studies", "yoruba"]);
    expect(preTicked(CATALOGUE, ["senior"])).toEqual(["yoruba", "french", "biology"]);
  });
});

describe("defaultLink", () => {
  it("makes core compulsory and the rest elective, with senior departments", () => {
    expect(defaultLink(CATALOGUE[0]!, "junior")).toEqual({ kind: "compulsory", department: null });
    expect(defaultLink(CATALOGUE[1]!, "junior")).toEqual({ kind: "elective", department: null });
    expect(defaultLink(CATALOGUE[3]!, "senior")).toEqual({ kind: "elective", department: "science" });
    expect(defaultLink(CATALOGUE[1]!, "senior")).toEqual({ kind: "elective", department: "arts" });
    expect(defaultLink(CATALOGUE[3]!, "junior")).toBeNull();
  });
});

describe("defaultLinks", () => {
  it("attaches each subject to the levels whose band offers it", () => {
    const levels = [
      { id: "j1", key: "jss1", section: "junior" as const },
      { id: "s1", key: "ss1", section: "senior" as const },
      { id: "n1", key: "nursery1", section: "preschool" as const },
    ];
    expect(defaultLinks([CATALOGUE[0]!, CATALOGUE[3]!], levels)).toEqual([
      { entryId: "english-studies", levelId: "j1", kind: "compulsory", department: null },
      { entryId: "biology", levelId: "s1", kind: "elective", department: "science" },
    ]);
  });
});

describe("subjectCode", () => {
  it("makes short codes for the school's own subjects, without clashing", () => {
    expect(subjectCode("Phonics")).toBe("PHO");
    expect(subjectCode("Verbal Reasoning")).toBe("VR");
    expect(subjectCode("Phonics", ["PHO"])).toBe("PHO2");
  });
});

describe("addSubjectsSchema", () => {
  it("needs at least one subject and different codes", () => {
    expect(addSubjectsSchema.safeParse({ catalogueIds: [], custom: [] }).success).toBe(false);
    expect(addSubjectsSchema.safeParse({ catalogueIds: [], custom: [{ name: "Phonics", code: "pho" }, { name: "Physics Lab", code: "PHO" }] }).success).toBe(false);
    expect(addSubjectsSchema.parse({ catalogueIds: [], custom: [{ name: "Phonics", code: "pho" }] }).custom[0]!.code).toBe("PHO");
  });
});
