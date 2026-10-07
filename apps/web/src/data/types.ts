// Shapes shared by every data function (docs/data-contract.md).
import type { SchoolDetails } from "@brillianda/core";

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
  owner: { fullName: string; email: string; phone?: string } | null;
  /** When the current code was sent (ms since 1970), for the expiry and resend timers. */
  codeSentAt: number | null;
  emailVerified: boolean;
};

/** The answer to "can we have this address?" while the owner types. */
export type SubdomainCheck =
  | { available: true; subdomain: string }
  | { available: false; subdomain: string; reason: "taken" | "reserved" | "invalid"; message: string; suggestions: string[] };
