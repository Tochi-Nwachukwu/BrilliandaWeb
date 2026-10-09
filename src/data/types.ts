// Shapes shared by every data function (docs/data-contract.md).
import type { Term } from "@brillianda/core/calendar";
import type { Department, Section } from "@brillianda/core/classes";
import type { SchoolDetails, SchoolLevel } from "@brillianda/core/signup";
import type { ImportArm, ImportLevel } from "@brillianda/core/studentImport";
import type { StudentGender, StudentStatus } from "@brillianda/core/students";
import type { Band, CatalogueEntry, LinkKind } from "@brillianda/core/subjects";

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

/** A class level on the school's ladder, e.g. JSS 1. */
export type ClassLevel = { id: string; key: string | null; name: string; short: string; section: Section; position: number; archived: boolean };
/** An arm name, kept once per school: renaming it renames it in every class. */
export type ArmName = { id: string; name: string; code: string };
/** One class: a level and an arm, e.g. JSS 1 Gold. */
export type ClassArm = { id: string; levelId: string; armNameId: string; department: Department | null; archived: boolean; studentCount: number };
export type ClassStructure = { levels: ClassLevel[]; armNames: ArmName[]; arms: ClassArm[]; levelsOffered: SchoolLevel[] };

/** A subject the school teaches: from the catalogue (kept linked through renames) or its own. */
export type Subject = { id: string; catalogueId: string | null; name: string; code: string; tag: "nerdc2025" | "legacy" | "custom"; catalogueName: string | null };
/** A subject attached to a class level, compulsory or elective (senior electives may carry a department). */
export type SubjectLink = { subjectId: string; levelId: string; kind: LinkKind; department: Department | null };
export type SubjectsSetup = { subjects: Subject[]; links: SubjectLink[]; levels: ClassLevel[]; catalogue: CatalogueEntry[]; bands: Band[] };

/** A class a student can sit in, labelled for pickers and lists ("JSS 1 Gold"). */
export type ArmOption = { id: string; label: string; chip: string; levelId: string; levelName: string; levelPosition: number };

/** A student as the list needs them. */
export type StudentRow = {
  id: string;
  fullName: string;
  admissionNo: string;
  gender: StudentGender;
  status: StudentStatus;
  armId: string;
  dateOfBirth: string;
  guardianName: string | null;
  guardianPhone: string | null;
};

export type StudentsList = { students: StudentRow[]; arms: ArmOption[]; nextAdmissionNo: string };

/** One student's page: details, guardian (with siblings), classes over time and changes. */
export type StudentDetail = StudentRow & {
  firstName: string;
  lastName: string;
  otherNames: string;
  admissionDate: string;
  address: string;
  stateOfOrigin: string;
  guardian: { id: string; name: string; phone: string | null; email: string | null; siblings: { id: string; fullName: string; armLabel: string }[] } | null;
  classHistory: { armLabel: string; from: string }[];
  changes: ChangeEntry[];
};

/** A guardian already on file, found by phone, so siblings can share one record. */
export type GuardianMatch = { id: string; name: string; phone: string; children: string[] };

export type AdmissionSettings = { pattern: string; digits: number; next: number; preview: string };

/** What the import page needs to check rows in the browser, and its recent imports. */
export type ImportSetup = {
  schoolName: string;
  levels: ImportLevel[];
  arms: ImportArm[];
  existing: { id: string; admissionNo: string; fullName: string; dateOfBirth: string }[];
  /** Headings (lower case) to columns, from the last import. */
  savedMapping: Record<string, string>;
  batches: ImportBatchSummary[];
};
export type ImportBatchSummary = { id: string; at: number; by: string; fileName: string; created: number; updated: number; undoable: boolean; undone: boolean };
export type ImportResult = { batchId: string; created: number; updated: number; skipped: number; notImported: number; newStudents: { id: string; fullName: string; armLabel: string }[] };
