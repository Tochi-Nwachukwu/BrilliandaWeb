// Shapes shared by every data function (docs/data-contract.md).
import type { SchoolDetails, Term } from "@brillianda/core";

/** What every write returns: the result, or a message for a person and errors under each field. */
export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/** A school as its pages need it: who it is and how it looks. */
export type SchoolSummary = {
  subdomain: string;
  name: string;
  status: "active" | "suspended" | "archived";
  /** A hex colour, e.g. #4A3AA7. Text colours on it are worked out by the front end. */
  brandColor: string;
  logoUrl: string | null;
};

/** Where someone has got to in signup. Never includes the password. */
export type SignupStep = "school" | "owner" | "verify" | "address";
export type SignupDraft = {
  step: SignupStep;
  school: SchoolDetails | null;
  owner: { fullName: string; email: string } | null;
  /** When the current code was sent (ms since 1970), for the expiry and resend timers. */
  codeSentAt: number | null;
  emailVerified: boolean;
};

/** The answer to "can we have this address?" while the owner types. */
export type SubdomainCheck =
  | { available: true; subdomain: string }
  | { available: false; subdomain: string; reason: "taken" | "reserved" | "invalid"; message: string; suggestions: string[] };

export type SchoolRole = "owner" | "admin";

/** Who is signed in at a school, and as what. */
export type SignedInMember = { userId: string; fullName: string; email: string; role: SchoolRole };

/** Someone on a school's team, or invited to it. */
export type SchoolMember = {
  id: string;
  fullName: string;
  email: string;
  role: SchoolRole;
  status: "active" | "invited";
  /** For invites: when it was sent (ms since 1970). */
  invitedAt?: number;
};

export type InviteDetails = { schoolName: string; fullName: string; email: string; status: "open" | "used" | "expired"; hasAccount: boolean };

/**
 * FAKE ONLY: what the email would have said, so screens can be clicked through before real
 * emails exist. The real functions never return this.
 */
export type SampleEmail = { sampleLinks?: { label: string; href: string }[] };

/** The school's current session and its terms. `confirmed` is false until someone saves it. */
export type SessionSetup = { startYear: number; name: string; terms: Term[]; confirmed: boolean };

/** The plan's setup checklist, in its order. */
export type SetupItemId = "calendar" | "classes" | "arms" | "subjects" | "students" | "admins";
export type SetupProgress = { items: { id: SetupItemId; done: boolean }[]; hidden: boolean };

/** One line of the school's record of changes. */
export type ChangeEntry = { id: string; at: number; who: string; what: string };

/** The counts and recent changes on Home. */
export type HomeSummary = { students: number; classes: number; arms: number; subjects: number; admins: number; recent: ChangeEntry[] };
