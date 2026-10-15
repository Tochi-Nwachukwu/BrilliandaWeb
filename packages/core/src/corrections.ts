// A parent asking the school to correct their child's details (user request, 15 Oct 2026). The
// parent proposes new values; an admin approves (the record changes) or declines with a reason.
import { z } from "zod";
import { NIGERIAN_STATES, normaliseNigerianPhone } from "./nigeria";
import { GENDERS, optionalPersonName, personName } from "./students";

export const CORRECTABLE = ["firstName", "otherNames", "lastName", "dateOfBirth", "gender", "stateOfOrigin", "address", "guardianPhone", "guardianEmail"] as const;
export type CorrectableField = (typeof CORRECTABLE)[number];

export const CORRECTION_LABEL: Record<CorrectableField, string> = {
  firstName: "First name",
  otherNames: "Other names",
  lastName: "Last name",
  dateOfBirth: "Date of birth",
  gender: "Gender",
  stateOfOrigin: "State of origin",
  address: "Home address",
  guardianPhone: "Your phone number",
  guardianEmail: "Your email",
};

/** The same fields as the school sees them. */
export const CORRECTION_LABEL_FOR_SCHOOL: Record<CorrectableField, string> = {
  ...CORRECTION_LABEL,
  guardianPhone: "Guardian’s phone number",
  guardianEmail: "Guardian’s email",
};

/** Each field's own rule, the same as on the school's student form. */
const RULES: Record<CorrectableField, z.ZodType<string>> = {
  firstName: personName("first name"),
  otherNames: optionalPersonName,
  lastName: personName("last name"),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date")
    .refine((d) => d <= new Date().toISOString().slice(0, 10), "A birth date can’t be in the future"),
  gender: z.enum(GENDERS, { error: "Choose Male or Female" }),
  stateOfOrigin: z.enum(NIGERIAN_STATES, { error: "Choose a state" }),
  address: z.string().trim().min(5, "Enter the address").max(200, "Use at most 200 characters"),
  guardianPhone: z
    .string()
    .trim()
    .refine((v) => normaliseNigerianPhone(v) !== null, "Enter a Nigerian number, e.g. 0803 000 0001")
    .transform((v) => normaliseNigerianPhone(v)!),
  guardianEmail: z.string().trim().toLowerCase().pipe(z.email("Check this email address")),
};

/** A field's new value, cleaned (a phone in +234 form, names tidied), or the problem with it. */
export function checkCorrection(field: CorrectableField, value: string): { ok: true; value: string } | { ok: false; error: string } {
  const parsed = RULES[field].safeParse(value);
  return parsed.success ? { ok: true, value: parsed.data } : { ok: false, error: parsed.error.issues[0]?.message ?? "Check this" };
}

export const correctionRequestSchema = z
  .object({
    changes: z
      .array(z.object({ field: z.enum(CORRECTABLE, { error: "Choose what to correct" }), value: z.string() }))
      .min(1, "Say what needs correcting")
      .max(CORRECTABLE.length),
    note: z.string().trim().max(300, "Use at most 300 characters"),
  })
  .superRefine((input, ctx) => {
    const seen = new Set<string>();
    input.changes.forEach((change, i) => {
      if (seen.has(change.field)) ctx.addIssue({ code: "custom", path: ["changes", i, "field"], message: "This one is already in the request" });
      seen.add(change.field);
      const checked = checkCorrection(change.field, change.value);
      if (!checked.ok) ctx.addIssue({ code: "custom", path: ["changes", i, "value"], message: checked.error });
    });
  })
  .transform((input) => ({
    note: input.note,
    changes: input.changes.map((c) => ({ field: c.field, value: (checkCorrection(c.field, c.value) as { value: string }).value })),
  }));
export type CorrectionRequest = z.output<typeof correctionRequestSchema>;

/** Why an admin declined, shown to the parent. */
export const declineSchema = z.object({ reason: z.string().trim().min(3, "Say why, briefly").max(200, "Use at most 200 characters") });
