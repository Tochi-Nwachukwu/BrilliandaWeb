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

/**
 * Owners and admins run the school; teachers see only their own classes (batch 11); parents only
 * their own children (batch 12); students only themselves (batch 23).
 */
export type SchoolRole = "owner" | "admin" | "teacher" | "parent" | "student";
export const ROLE_LABEL: Record<SchoolRole, string> = { owner: "School owner", admin: "School admin", teacher: "Teacher", parent: "Parent", student: "Student" };
/** The roles that can open the school's admin screens. */
export const ADMIN_ROLES: readonly SchoolRole[] = ["owner", "admin"];
export const isAdminRole = (role: SchoolRole | null | undefined) => role === "owner" || role === "admin";

/** Invite links work once and for 7 days (the API’s rule). */
export const INVITE_LIFETIME_DAYS = 7;
export const INVITE_LIFETIME_HOURS = INVITE_LIFETIME_DAYS * 24;
/** Email sign-in links work for 15 minutes, password reset links for 30 (the API’s rules). */
export const LINK_LIFETIME_MINUTES = { magic: 15, reset: 30 } as const;
