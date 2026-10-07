// API contract for the Brillanda team portal (SUPER_ADMIN), DECISIONS.md F-36. The web app is built
// against these shapes with stand-in data first; the API must return exactly these when it ships.

/** Mirrors the SchoolStatus enum. A trial is a plan tier, not a status. */
export type SchoolStatus = "ACTIVE" | "SUSPENDED";
/** Mirrors the PlanTier enum. */
export type PlanTier = "TRIAL" | "BASIC" | "STANDARD";

/** One school, as the Brillanda team sees it. */
export type PlatformSchool = {
  id: string;
  name: string;
  /** Town or city, for telling schools apart. */
  city: string | null;
  status: SchoolStatus;
  planTier: PlanTier;
  /** When a TRIAL plan runs out (ISO date). Null on paid plans. New column: School.trialEndsAt. */
  trialEndsAt: string | null;
  studentCount: number;
  studentLimit: number;
  /** Share of this term's subject sheets marked complete, 0 to 1; null when no term is open. */
  scoresInShare: number | null;
  admin: { fullName: string; email: string } | null;
  createdAt: string;
  lastActiveAt: string | null;
  /** Why the school is suspended, when it is. */
  suspendedReason: string | null;
};

/** POST /platform/schools. Creates the school and emails its admin an invite. */
export type CreateSchoolRequest = {
  name: string;
  city: string;
  adminName: string;
  adminEmail: string;
  planTier: PlanTier;
  /** The trial request this school came from, if any; it is marked SCHOOL_CREATED. */
  trialRequestId?: string;
};

/** POST /platform/schools/:id/suspend */
export type SuspendSchoolRequest = { reason: string };
/** POST /platform/schools/:id/extend-trial */
export type ExtendTrialRequest = { days: number };
/** POST /platform/schools/:id/plan */
export type ChangePlanRequest = { planTier: PlanTier };

export type TrialRequestStatus = "NEW" | "CALL_BOOKED" | "SCHOOL_CREATED" | "DECLINED";

/** A "Request a trial" form sent from the website (DECISIONS.md D-12). New table: TrialRequest. */
export type TrialRequest = {
  id: string;
  schoolName: string;
  city: string;
  studentEstimate: number | null;
  contactName: string;
  contactRole: string | null;
  email: string;
  phone: string | null;
  message: string | null;
  createdAt: string;
  status: TrialRequestStatus;
  /** Set once a call is booked (ISO date-time). */
  callAt: string | null;
  /** Set once a school has been created from this request. */
  schoolId: string | null;
};

/** POST /platform/trial-requests/:id/book-call */
export type BookCallRequest = { callAt: string };
/** POST /platform/trial-requests/:id/decline */
export type DeclineTrialRequest = { reason?: string };

export type PlatformActivityKind =
  | "PUBLISH"
  | "INVITE"
  | "IMPORT"
  | "TRIAL_REQUEST"
  | "SCHOOL_CREATED"
  | "SETTINGS"
  | "BILLING"
  | "SUSPEND"
  | "RESTORE";

/** One line in the platform timeline. Built from AuditLog rows across schools. */
export type PlatformActivity = {
  id: string;
  at: string;
  kind: PlatformActivityKind;
  schoolId: string | null;
  schoolName: string | null;
  /** A complete sentence, e.g. "Crestview Academy published JSS 3 results." */
  text: string;
};

/** GET /platform/usage: sign-ins today, across every school. */
export type PlatformUsage = {
  signedInToday: number;
  byRole: { teachers: number; parents: number; admins: number };
};
