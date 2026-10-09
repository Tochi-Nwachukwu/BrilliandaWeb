import { describe, expect, it } from "vitest";
import { brandPalette, contrast } from "./brand";
import { BRAND_SWATCHES, brandingSchema, fitLogo, LOGO_UPLOAD_MAX_BYTES, logoProblem } from "./branding";

describe("brandingSchema", () => {
  it("tidies the name and the colour", () => {
    expect(brandingSchema.parse({ name: "  Surebloom School ", brandColor: "1e6b45" })).toEqual({ name: "Surebloom School", brandColor: "#1E6B45" });
  });
  it("explains a colour it can't read", () => {
    const result = brandingSchema.safeParse({ name: "Surebloom", brandColor: "green" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/#1E6B45/);
  });
  it("needs a name", () => {
    expect(brandingSchema.safeParse({ name: " ", brandColor: "#1E6B45" }).success).toBe(false);
  });
});

describe("swatches", () => {
  it("all give readable buttons and highlights", () => {
    for (const { hex } of BRAND_SWATCHES) {
      const p = brandPalette(hex);
      expect(contrast(p.primary, p.primaryText)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(p.accent, "#FFFFFF")).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("are distinct", () => {
    expect(new Set(BRAND_SWATCHES.map((s) => s.hex)).size).toBe(BRAND_SWATCHES.length);
  });
});

describe("logos", () => {
  it("accepts PNG, JPG and WebP", () => {
    expect(logoProblem({ type: "image/png", size: 40_000 })).toBeNull();
    expect(logoProblem({ type: "image/jpeg", size: 4_000_000 })).toBeNull();
  });
  it("refuses SVG, other files and very large images", () => {
    expect(logoProblem({ type: "image/svg+xml", size: 1000 })).toMatch(/SVG/);
    expect(logoProblem({ type: "application/pdf", size: 1000 })).toMatch(/PNG, JPG or WebP/);
    expect(logoProblem({ type: "image/png", size: 20_000_000 })).toMatch(/too large/);
    expect(logoProblem({ type: "image/png", size: LOGO_UPLOAD_MAX_BYTES + 1 }, LOGO_UPLOAD_MAX_BYTES)).toMatch(/under 300 KB/);
  });
  it("shrinks to fit without enlarging", () => {
    expect(fitLogo(2048, 1024)).toEqual({ width: 512, height: 256 });
    expect(fitLogo(300, 120)).toEqual({ width: 300, height: 120 });
  });
});
