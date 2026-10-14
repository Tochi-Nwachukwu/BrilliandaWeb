// Signing in at a school, resetting a password, and inviting admins (plan: "Signing in later",
// owner and admin accounts). Checked in the browser and again by the server.
import { z } from "zod";

const email = z.preprocess((v) => (typeof v === "string" ? v.trim().toLowerCase() : v), z.email("Enter an email address like name@school.com"));

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});

/** Find my school, forgotten password and email sign-in links all ask for just an email. */
export const emailOnlySchema = z.object({ email });

export const PASSWORD_MIN = 8;

/** A new password, typed twice. */
export const newPasswordSchema = z
  .object({
    password: z.string().min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters`).max(128, "Use at most 128 characters"),
    confirmation: z.string(),
  })
  .refine((v) => v.password === v.confirmation, { path: ["confirmation"], message: "The two passwords don’t match" });

export const inviteAdminSchema = z.object({
  fullName: z.string().trim().min(2, "Enter their full name").max(120, "Use at most 120 characters"),
  email,
});

/** Owners and admins run the school; teachers see only their own classes (batch 11). */
export type SchoolRole = "owner" | "admin" | "teacher";
export const ROLE_LABEL: Record<SchoolRole, string> = { owner: "School owner", admin: "School admin", teacher: "Teacher" };
/** The roles that can open the school's admin screens. */
export const ADMIN_ROLES: readonly SchoolRole[] = ["owner", "admin"];
export const isAdminRole = (role: SchoolRole | null | undefined) => role === "owner" || role === "admin";

/** Invite links work once and for 72 hours. */
export const INVITE_LIFETIME_HOURS = 72;
/** Password reset and email sign-in links work for an hour. */
export const LINK_LIFETIME_MINUTES = 60;
