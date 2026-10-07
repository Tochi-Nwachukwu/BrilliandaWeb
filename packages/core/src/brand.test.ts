import { describe, expect, it } from "vitest";
import { AA, brandPalette, contrast, normaliseHex, PAGE_BG, schoolInitials, SURFACE } from "./brand";

describe("normaliseHex", () => {
  it("reads the common ways of writing a colour", () => {
    expect(normaliseHex("#4a3aa7")).toBe("#4A3AA7");
    expect(normaliseHex("4A3AA7")).toBe("#4A3AA7");
    expect(normaliseHex("#43a")).toBe("#4433AA");
    expect(normaliseHex("purple")).toBeNull();
    expect(normaliseHex("#12345")).toBeNull();
  });
});

describe("contrast", () => {
  it("matches the known values", () => {
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21, 0);
    expect(contrast("#777777", "#FFFFFF")).toBeCloseTo(4.48, 1);
  });
});

// A spread of colours a school might pick: dark, mid, pale, and the awkward yellows and cyans.
const PICKS = ["#4A3AA7", "#1E6B45", "#9A3B2E", "#FFD400", "#F5F5DC", "#00FFFF", "#FF6A00", "#E91E63", "#0A2342", "#9CCC65", "#FFFFFF", "#000000", "#7D7D96", "#808080"];

describe("brandPalette", () => {
  it("puts white text on dark colours and ink on light ones", () => {
    expect(brandPalette("#4A3AA7").primaryText).toBe("#FFFFFF");
    expect(brandPalette("#FFD400").primaryText).toBe("#231E36");
  });

  it.each(PICKS)("keeps every text readable for %s", (pick) => {
    const p = brandPalette(pick);
    expect(contrast(p.primaryText, p.primary), `text on ${p.primary}`).toBeGreaterThanOrEqual(AA);
    for (const bg of [PAGE_BG, SURFACE, p.accentSoft]) expect(contrast(p.accent, bg), `${p.accent} on ${bg}`).toBeGreaterThanOrEqual(AA);
  });

  it("leaves a readable colour as it is", () => {
    expect(brandPalette("#4A3AA7").accent).toBe("#4A3AA7");
    expect(brandPalette("#1E6B45").accent).toBe("#1E6B45");
  });

  it("falls back to our violet for a broken value", () => {
    expect(brandPalette("not a colour").primary).toBe("#4A3AA7");
  });
});

describe("schoolInitials", () => {
  it("takes two initials", () => {
    expect(schoolInitials("Greenfield College")).toBe("GC");
    expect(schoolInitials("St. Mary's High School")).toBe("SM");
    expect(schoolInitials("")).toBe("S");
  });
});
