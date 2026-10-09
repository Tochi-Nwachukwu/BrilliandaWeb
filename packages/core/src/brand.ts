// A school's brand colour (plan: branding). It goes on buttons and highlights; everything else
// keeps our look. Any colour a school picks must still give readable text, so the shades used
// for text are worked out here and checked against WCAG AA (4.5:1).

export type Rgb = [number, number, number];

/** "#4a3aa7", "4A3AA7" or "#43a" → "#4A3AA7"; null if it isn't a colour. */
export function normaliseHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, "");
  const full = /^[0-9a-f]{3}$/i.test(raw) ? [...raw].map((c) => c + c).join("") : raw;
  return /^[0-9a-f]{6}$/i.test(full) ? `#${full.toUpperCase()}` : null;
}

export function hexToRgb(hex: string): Rgb {
  const h = normaliseHex(hex);
  if (!h) throw new Error(`Not a colour: ${hex}`);
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

export function rgbToHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Mix two colours; `amount` is how much of `b` (0 to 1). */
export function mix(a: string, b: string, amount: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return rgbToHex([0, 1, 2].map((i) => x[i]! + (y[i]! - x[i]!) * amount) as Rgb);
}

// Our Pastel tokens the brand sits on (src/styles/tokens.css).
export const PAGE_BG = "#F4F2FA";
export const SURFACE = "#FFFFFF";
export const INK = "#231E36";
const WHITE = "#FFFFFF";
const BLACK = "#000000";
export const AA = 4.5;

export type BrandPalette = {
  /** Buttons and the sign-in panel. */
  primary: string;
  primaryHover: string;
  /** Text on `primary`. */
  primaryText: string;
  /** Highlights and text in the brand colour on light backgrounds (active tab, links). */
  accent: string;
  /** A soft tint behind highlights, e.g. the active tab. */
  accentSoft: string;
};

/** Darken a colour step by step until it reads on every given background. */
function darkenUntilReadable(hex: string, backgrounds: string[]): string {
  for (let step = 0; step <= 20; step++) {
    const shade = mix(hex, BLACK, step * 0.05);
    if (backgrounds.every((bg) => contrast(shade, bg) >= AA)) return shade;
  }
  return INK;
}

/** Everything the app needs to wear a school's colour while keeping text readable. */
export function brandPalette(brandColor: string): BrandPalette {
  const picked = normaliseHex(brandColor) ?? "#4A3AA7";
  // Some mid-tones read with neither white nor ink; those buttons go just dark enough for white.
  const readsAsIs = Math.max(contrast(WHITE, picked), contrast(INK, picked)) >= AA;
  const primary = readsAsIs ? picked : darkenUntilReadable(picked, [WHITE]);
  const primaryText = contrast(WHITE, primary) >= contrast(INK, primary) ? WHITE : INK;
  const primaryHover = mix(primary, BLACK, primaryText === WHITE ? 0.15 : 0.08);
  const accentSoft = mix(picked, WHITE, 0.86);
  const accent = darkenUntilReadable(picked, [PAGE_BG, SURFACE, accentSoft]);
  return { primary, primaryHover, primaryText, accent, accentSoft };
}

/** Two letters for a school without a logo: "Greenfield College" → GC. */
export function schoolInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter((word) => /^[A-Za-z0-9]/.test(word))
      .map((word) => word[0]!.toUpperCase())
      .slice(0, 2)
      .join("") || "S"
  );
}
