import { describe, expect, it } from "vitest";
import {
  ARM_PRESETS,
  armChip,
  armCode,
  armCodes,
  armLabel,
  buildLadder,
  classSetupSchema,
  defaultRange,
  ladderOptions,
  previewSentence,
  renameLadder,
  setupLabels,
} from "./classes";

describe("buildLadder", () => {
  it("makes every level from the first to the last, in order", () => {
    expect(buildLadder("jss1", "ss3", "nigerian").map((l) => l.name)).toEqual(["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"]);
    expect(buildLadder("nursery1", "primary6", "nigerian").map((l) => l.short)).toEqual(["N1", "N2", "N3", "P1", "P2", "P3", "P4", "P5", "P6"]);
  });

  it("names the same places in each scheme", () => {
    expect(buildLadder("jss1", "jss3", "basic").map((l) => l.name)).toEqual(["Basic 7", "Basic 8", "Basic 9"]);
    expect(buildLadder("jss1", "ss3", "british").map((l) => l.name)).toEqual(["Year 7", "Year 8", "Year 9", "Year 10", "Year 11", "Year 12"]);
    expect(buildLadder("primary1", "primary2", "american").map((l) => l.name)).toEqual(["Grade 1", "Grade 2"]);
  });

  it("keeps the sections", () => {
    expect(buildLadder("jss3", "ss1", "nigerian").map((l) => l.section)).toEqual(["junior", "senior"]);
  });

  it("works either way round", () => {
    expect(buildLadder("ss3", "ss1", "nigerian").map((l) => l.name)).toEqual(["SS 1", "SS 2", "SS 3"]);
  });

  it("covers the whole ladder: 17 places in the Nigerian scheme, 16 in the British", () => {
    expect(ladderOptions("nigerian")).toHaveLength(17);
    expect(ladderOptions("british")).toHaveLength(16);
  });
});

describe("renameLadder", () => {
  it("switches scheme but keeps custom classes", () => {
    const levels = [...buildLadder("jss1", "jss3", "nigerian"), { key: null, name: "Pre-JSS", short: "PJ", section: "junior" as const }];
    expect(renameLadder(levels, "british").map((l) => l.name)).toEqual(["Year 7", "Year 8", "Year 9", "Pre-JSS"]);
  });
});

describe("defaultRange", () => {
  it("follows the plan", () => {
    expect(defaultRange(["SECONDARY"])).toEqual({ first: "jss1", last: "ss3" });
    expect(defaultRange(["PRIMARY"])).toEqual({ first: "nursery1", last: "primary6" });
    expect(defaultRange(["PRIMARY", "SECONDARY"])).toEqual({ first: "nursery1", last: "ss3" });
    expect(defaultRange(["NURSERY"])).toEqual({ first: "creche", last: "nursery3" });
  });
});

describe("arms", () => {
  it("makes short codes", () => {
    expect(armCode("Anthurium")).toBe("ANT");
    expect(armCode("Calla Lily")).toBe("CAL");
    expect(armCode("A")).toBe("A");
    expect(armCodes(["Diamond", "Diana", "Diamonds"])).toEqual(["DIA", "DI2", "DI3"]);
  });

  it("has ten names in every preset, each with its own code", () => {
    for (const preset of Object.values(ARM_PRESETS)) {
      expect(preset.names).toHaveLength(10);
      expect(new Set(armCodes([...preset.names])).size).toBe(10);
    }
  });

  it("labels a class plainly when it has one arm", () => {
    expect(armLabel("JSS 1", "Anthurium", 3)).toBe("JSS 1 Anthurium");
    expect(armLabel("JSS 1", "A", 1)).toBe("JSS 1");
    expect(armChip("JSS1", "ANT", 3)).toBe("JSS1 ANT");
  });
});

describe("the setup", () => {
  const levels = buildLadder("jss1", "ss3", "nigerian");
  const flowers = ARM_PRESETS.flowers.names.slice(0, 3);
  const arms = flowers.map((name, i) => ({ name, code: armCodes(flowers)[i]! }));
  const setup = { levels, arms, armsByLevel: levels.map(() => [0, 1, 2]) };

  it("passes the plan's gate: JSS 1 to SS 3 with three flower arms is 18 classes", () => {
    expect(classSetupSchema.safeParse(setup).success).toBe(true);
    const labels = setupLabels(setup);
    expect(labels).toHaveLength(18);
    expect(previewSentence(labels)).toBe("This creates 18 classes: JSS 1 Anthurium, JSS 1 Begonia, JSS 1 Calla Lily and 15 more.");
  });

  it("lets classes differ", () => {
    const uneven = { ...setup, armsByLevel: [[0, 1, 2], [0, 1], [0], [0, 1], [0, 1], [0]] };
    expect(setupLabels(uneven)).toEqual([
      "JSS 1 Anthurium", "JSS 1 Begonia", "JSS 1 Calla Lily", "JSS 2 Anthurium", "JSS 2 Begonia", "JSS 3",
      "SS 1 Anthurium", "SS 1 Begonia", "SS 2 Anthurium", "SS 2 Begonia", "SS 3",
    ]);
  });

  it("refuses repeated names and codes, and a class with no arm", () => {
    const issues = (input: unknown) => (classSetupSchema.safeParse(input).error?.issues ?? []).map((i) => `${i.path.join(".")}: ${i.message}`);
    expect(issues({ ...setup, levels: [levels[0], { ...levels[1]!, name: "jss 1" }, ...levels.slice(2)] })).toContain("levels.1.name: Two classes can’t share a name");
    expect(issues({ ...setup, arms: [arms[0], { ...arms[1]!, code: "ANT" }, arms[2]] })).toContain("arms.1.code: Two arms can’t share a code");
    expect(issues({ ...setup, armsByLevel: [[], ...setup.armsByLevel.slice(1)] })).toContain("armsByLevel.0: Every class needs at least one arm");
  });

  it("says so for a single class", () => {
    expect(previewSentence(["JSS 1"])).toBe("This creates 1 class: JSS 1.");
  });
});
