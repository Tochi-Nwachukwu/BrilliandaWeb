// A school's name, colour and logo (plan: "School branding"). Set from More › Branding, and offered
// on the setup checklist. The rules live here so the browser and the server check the same things.
import { z } from "zod";
import { normaliseHex } from "./brand";

/** The colour every new school starts with until the owner picks one. */
export const DEFAULT_BRAND_COLOR = "#4A3AA7";

/** Suggestions on the Branding screen; any colour can be typed in too. */
export const BRAND_SWATCHES = [
  { name: "Lilac", hex: "#4A3AA7" },
  { name: "Royal blue", hex: "#1F4E9C" },
  { name: "Teal", hex: "#0E6E8C" },
  { name: "Green", hex: "#1E6B45" },
  { name: "Olive", hex: "#5B6B1E" },
  { name: "Maroon", hex: "#7A1F35" },
  { name: "Brick", hex: "#9A3B2E" },
  { name: "Gold", hex: "#B8860B" },
  { name: "Purple", hex: "#7A3E9D" },
  { name: "Navy", hex: "#1C2A4A" },
] as const;

export const brandingSchema = z.object({
  name: z.string().trim().min(2, "Enter the school’s name").max(120, "Use at most 120 characters"),
  brandColor: z
    .string()
    .trim()
    .refine((v) => normaliseHex(v) !== null, "Enter a colour like #1E6B45, or pick one above")
    .transform((v) => normaliseHex(v)!),
});
export type Branding = z.infer<typeof brandingSchema>;

/**
 * Logos. The browser shrinks the picked image to fit LOGO_SIZE and re-encodes it, which also drops
 * hidden details such as where a photo was taken, so only small, plain images reach the server.
 * SVG is refused: it can carry scripts.
 */
export const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
/** The file a person picks, before shrinking. Phone photos are often 3 to 5 MB. */
export const LOGO_PICK_MAX_BYTES = 8 * 1024 * 1024;
/** What the server accepts, after shrinking. */
export const LOGO_UPLOAD_MAX_BYTES = 300 * 1024;
export const LOGO_SIZE = 512;

/** Why a picked file can't be a logo, in words for a person; null if it can. */
export function logoProblem(file: { type: string; size: number }, maxBytes = LOGO_PICK_MAX_BYTES): string | null {
  if (file.type === "image/svg+xml") return "SVG logos aren’t accepted. Export it as PNG or JPG and upload that.";
  if (!(LOGO_TYPES as readonly string[]).includes(file.type)) return "Upload a PNG, JPG or WebP image.";
  const limit = maxBytes >= 1024 * 1024 ? `${Math.round(maxBytes / (1024 * 1024))} MB` : `${Math.round(maxBytes / 1024)} KB`;
  if (file.size > maxBytes) return `This image is too large. Use one under ${limit}.`;
  return null;
}

/** The size that fits inside a LOGO_SIZE square without stretching or enlarging. */
export function fitLogo(width: number, height: number, max = LOGO_SIZE): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
