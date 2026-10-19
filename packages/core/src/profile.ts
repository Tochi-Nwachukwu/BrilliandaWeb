// My profile (every dashboard): your name, photo and password. Checked in the browser and again by
// the server. Email and phone stay with the school's records, so they aren't edited here.
import { z } from "zod";
import { PASSWORD_MIN } from "./auth";

const namePart = (label: string) =>
  z.preprocess((v) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ") : v), z.string().min(1, `Enter your ${label}`).max(60, "Use at most 60 characters"));

export const profileSchema = z.object({ firstName: namePart("first name"), lastName: namePart("last name") });
export type ProfileInput = z.infer<typeof profileSchema>;

/** A stored full name as the two boxes show it: the last word is the last name. Joining them gives it back. */
export function splitName(fullName: string): { firstName: string; lastName: string } {
  const name = fullName.trim().replace(/\s+/g, " ");
  const cut = name.lastIndexOf(" ");
  return cut < 0 ? { firstName: name, lastName: "" } : { firstName: name.slice(0, cut), lastName: name.slice(cut + 1) };
}

export const joinName = ({ firstName, lastName }: ProfileInput) => `${firstName} ${lastName}`;

/** Changing your password while signed in: the current one, then the new one twice. */
export const changePasswordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password"),
    password: z.string().min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`).max(128, "Use at most 128 characters"),
    confirmation: z.string(),
  })
  .refine((v) => v.password === v.confirmation, { path: ["confirmation"], message: "The two passwords don’t match" })
  .refine((v) => v.password !== v.current, { path: ["password"], message: "Choose a password you haven’t used here" });

/** A profile photo: the browser shrinks it to a small square JPEG first, so this is a short data URL. */
export const PHOTO_SIZE = 256;
export const PHOTO_MAX_CHARS = 200_000;
export const photoSchema = z.string().regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, "That isn’t a picture").max(PHOTO_MAX_CHARS, "That picture is too big");
