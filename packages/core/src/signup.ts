// The four signup screens (plan: "Creating a school"). One schema per screen, checked in the
// browser as the owner goes and again by the server.
import { z } from "zod";
import { NIGERIAN_STATES, normaliseNigerianPhone } from "./nigeria";
import { normaliseSubdomain, subdomainProblem } from "./subdomain";

export const SCHOOL_LEVELS = ["NURSERY", "PRIMARY", "SECONDARY"] as const;
export type SchoolLevel = (typeof SCHOOL_LEVELS)[number];
export const SCHOOL_LEVEL_LABEL: Record<SchoolLevel, string> = { NURSERY: "Nursery", PRIMARY: "Primary", SECONDARY: "Secondary" };

export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"] as const;

const phone = (message: string) =>
  z
    .string()
    .trim()
    .refine((v) => normaliseNigerianPhone(v) !== null, message)
    .transform((v) => normaliseNigerianPhone(v)!);

const trimmedLower = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase() : v);

/** Screen 1. The first session is when the school starts using Brillianda (user decision, Oct 2026). */
export const schoolDetailsSchema = z.object({
  schoolName: z.string().trim().min(2, "Enter the school’s name").max(120, "Use at most 120 characters"),
  levels: z.array(z.enum(SCHOOL_LEVELS)).min(1, "Tick at least one"),
  state: z.enum(NIGERIAN_STATES, { error: "Choose a state" }),
  phone: phone("Enter a Nigerian number, e.g. 0803 000 0001"),
  sessionStartMonth: z.coerce.number().int().min(1, "Choose a month").max(12, "Choose a month"),
  sessionStartYear: z.coerce.number().int().min(2000, "Choose a year").max(2100, "Choose a year"),
});
export type SchoolDetails = z.infer<typeof schoolDetailsSchema>;

/** Screen 2. This email becomes the school's primary email. */
export const ownerAccountSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120, "Use at most 120 characters"),
  email: z.preprocess(trimmedLower, z.email("Enter an email address like name@school.com")),
  password: z.string().min(8, "Use at least 8 characters").max(128, "Use at most 128 characters"),
  phone: z.union([z.literal("").transform(() => undefined), phone("Enter a Nigerian number, or leave it empty")]).optional(),
});
export type OwnerAccount = z.infer<typeof ownerAccountSchema>;

/** Screen 3. */
export const CODE_LIFETIME_SECONDS = 10 * 60;
export const RESEND_AFTER_SECONDS = 60;
export const verifyCodeSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6 digits from the email"),
});

/** Screen 4. Whether the name is free is checked separately, against the schools that exist. */
export const schoolAddressSchema = z.object({
  subdomain: z
    .string()
    .transform(normaliseSubdomain)
    .superRefine((name, ctx) => {
      const problem = subdomainProblem(name);
      if (problem) ctx.addIssue({ code: "custom", message: problem.message });
    }),
});

/**
 * When a school signing up today most likely started its current session: September of this
 * year from August on, otherwise last September. October 2026 gives September 2026 (2026/2027).
 */
export function defaultSessionStart(today: Date): { month: number; year: number } {
  const year = today.getMonth() >= 7 ? today.getFullYear() : today.getFullYear() - 1;
  return { month: 9, year };
}

/** "2026/2027" for a session that starts in 2026. */
export function sessionName(startYear: number): string {
  return `${startYear}/${startYear + 1}`;
}

/** Errors under each field, from a failed parse, in the shape every write returns. */
export function fieldErrorsOf(error: z.ZodError): Record<string, string[]> {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
}

/** Check values against a schema: the parsed data, or the errors under each field. */
export function checkWith<S extends z.ZodType>(schema: S, values: unknown): { ok: true; data: z.output<S> } | { ok: false; fieldErrors: Record<string, string[]> } {
  const parsed = schema.safeParse(values);
  return parsed.success ? { ok: true, data: parsed.data } : { ok: false, fieldErrors: fieldErrorsOf(parsed.error) };
}
