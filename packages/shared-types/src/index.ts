// Types and pure logic shared by the API and the web app. Keep this package dependency-free.

export * from "./grading";
export * from "./teacher";
export * from "./platform";
export * from "./admin";
export * from "./parent";
export * from "./admission";
export * from "./importing";

export const ROLES = ["SUPER_ADMIN", "SCHOOL_ADMIN", "TEACHER", "PARENT", "STUDENT"] as const;
export type Role = (typeof ROLES)[number];

/** Score-entry progress for one (arm, subject, term). */
export const ENTRY_STATES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETE", "LOCKED"] as const;
export type EntryState = (typeof ENTRY_STATES)[number];

/** Publishing gate for one (class, term). */
export const PUBLISH_STATES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETE", "LOCKED", "PUBLISHED"] as const;
export type PublishState = (typeof PUBLISH_STATES)[number];

/** How class positions are grouped (DECISIONS.md D-1). */
export type PositionScope = "ARM" | "CLASS";

/** COMPETITION ranks ties 1, 2, 2, 4; DENSE ranks them 1, 2, 2, 3 (DECISIONS.md D-2). */
export type TieMode = "COMPETITION" | "DENSE";

/** Stored in School.settings. A type alias (not an interface) so it is assignable to Prisma's Json input. */
export type SchoolSettings = {
  positionScope: PositionScope;
  tieMode: TieMode;
  /** Students may log in to see their own published results (FR-16.4). */
  studentSelfView: boolean;
  /** Parents without email may log in with a printed access code (DECISIONS.md D-5). */
  parentAccessCodes: boolean;
};

export const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = {
  positionScope: "ARM",
  tieMode: "COMPETITION",
  studentSelfView: false,
  parentAccessCodes: true,
};

/** Body of every 400 response (Build Guide §5). The score grid maps `fields` onto cells. */
export type ValidationErrorBody = {
  error: string;
  fields: Record<string, string[] | undefined>;
};

/** The signed-in user, as returned by login, refresh and GET /auth/me. */
export type SessionUser = {
  id: string;
  fullName: string;
  email: string | null;
  role: Role;
  school: { id: string; name: string; slug: string; logoUrl: string | null } | null;
};

/** Body of a successful login, access-code login, refresh or invite acceptance. */
export type SessionResponse = { accessToken: string; user: SessionUser };

/** GET /auth/invite/:token */
export type InviteDetails = {
  fullName: string;
  email: string | null;
  role: Role;
  schoolName: string | null;
};
