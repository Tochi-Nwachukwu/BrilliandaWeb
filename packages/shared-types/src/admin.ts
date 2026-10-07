import type { GradeBand } from "./grading";
import type { EntryState, PublishState } from "./index";
import type { TermResult } from "./parent";
import type { ScoreSheet, ScoreSheetComponent, TermRef } from "./teacher";

// API contract for the school admin portal (DECISIONS.md F-37). The web app is built against
// these shapes with stand-in data first; the API must return exactly these when it ships.

export type PersonRef = { id: string; fullName: string };

/** GET /admin/overview: the term at a glance. */
export type AdminOverview = {
  term: TermRef | null;
  /** Week of the term (1-based) and how many weeks it has; null outside a term. */
  week: { number: number; of: number } | null;
  scoresDueAt: string | null;
  /** One sheet = one subject in one arm. */
  sheets: { total: number; complete: number; inProgress: number; notStarted: number };
  /** Sheets complete at the end of each week so far, oldest first. */
  completeByWeek: number[];
  armsReadyToPublish: number;
  armsPublished: number;
  pendingUnlockRequests: number;
  students: number;
  studentsWithoutParent: number;
  /** Teachers with a sheet not started or under half done, most sheets first. */
  teachersBehind: { teacher: PersonRef; sheets: number }[];
};

/** One arm (JSS 1A) with where its sheets stand. */
export type ArmSummary = {
  id: string;
  name: string;
  className: string;
  /** Order of the class in the school, for grouping and colour (JSS 1 is 0). */
  classOrder: number;
  studentCount: number;
  formTeacher: PersonRef | null;
  /** Every subject's sheet state, in the school's subject order. */
  subjects: { subjectId: string; subjectName: string; status: EntryState }[];
  publishStatus: PublishState;
  pendingUnlockRequests: number;
};

export type UnlockRequestRef = { id: string; reason: string; requestedBy: PersonRef; createdAt: string };

/** GET /admin/arms/:armId */
export type ArmDetail = ArmSummary & {
  sheets: {
    subjectId: string;
    subjectName: string;
    teacher: PersonRef | null;
    status: EntryState;
    studentsComplete: number;
    unlockRequest: UnlockRequestRef | null;
    remindedAt: string | null;
  }[];
  students: {
    id: string;
    fullName: string;
    admissionNo: string;
    parentStatus: ParentStatus;
    /** Only once every subject is complete. */
    average: number | null;
    position: number | null;
  }[];
};

/** GET /admin/sheets?armId=&subjectId=: a read-only copy of a teacher's sheet. */
export type AdminSheet = ScoreSheet;

/** GET /admin/unlock-requests: pending requests, newest first. */
export type PendingUnlockRequest = UnlockRequestRef & { armId: string; armName: string; subjectId: string; subjectName: string };

/** POST /admin/reminders: an email and a note on each teacher's home screen. */
export type SendRemindersRequest = { teacherIds: string[]; note?: string };
export type SendRemindersResponse = { sent: number };

/** POST /admin/publish: publishes arms whose every sheet is complete, and emails their parents. */
export type PublishRequest = { armIds: string[] };
export type PublishResponse = { published: string[]; parentsEmailed: number; printedSlips: number };

/** GET /admin/report-cards/:studentId: what a parent will receive. */
export type ReportCard = {
  school: { name: string; motto: string | null; address: string | null };
  term: TermRef;
  student: { id: string; fullName: string; admissionNo: string; armName: string };
  subjects: { subjectName: string; scores: { component: string; maxScore: number; value: number | null; isAbsent: boolean }[]; total: number; grade: string; remark: string }[];
  average: number;
  position: number;
  of: number;
  classTeacherRemark: string | null;
  principalRemark: string | null;
  nextTermBegins: string | null;
  gradingScale: GradeBand[];
};

export type ParentStatus = "LINKED" | "INVITED" | "NONE";

export type Gender = "MALE" | "FEMALE";
/** Mirrors the schema's EnrollmentStatus. Anyone not ACTIVE has left the school. */
export type StudentStatus = "ACTIVE" | "WITHDRAWN" | "TRANSFERRED" | "GRADUATED";

/**
 * GET /admin/students: every student, including those who have left (`status`); the arm is
 * their current one, or their last one if they have left.
 */
export type AdminStudent = {
  id: string;
  fullName: string;
  admissionNo: string;
  armId: string;
  armName: string;
  classOrder: number;
  parentStatus: ParentStatus;
  gender: Gender | null;
  status: StudentStatus;
};

// ---- Enrolment (DECISIONS.md F-40) ----

export type GuardianDetails = { name: string | null; phone: string | null; email: string | null };

/** Something that happened to a student's record, for their timeline (F-42). */
export type StudentEvent = {
  at: string;
  kind: "ENROLLED" | "MOVED" | "LEFT" | "READMITTED" | "PARENT_INVITED" | "DETAILS_CHANGED";
  text: string;
};

/** A note the school keeps on a student: health, scholarship, behaviour. Seen by staff only. */
export type StudentNote = { id: string; text: string; createdAt: string; author: string };

/** GET /admin/students/:id */
export type StudentRecord = AdminStudent & {
  dob: string | null;
  guardian: GuardianDetails;
  /** When they joined the school; mid-session joiners have a date inside the session. */
  joinedOn: string;
  left: { on: string; reason: string | null } | null;
  photoUrl: string | null;
  /** Their class in each session, oldest first (from Enrollment rows). */
  classHistory: { sessionName: string; armName: string }[];
  /** Newest first. */
  events: StudentEvent[];
  /** Newest first. */
  notes: StudentNote[];
};

/**
 * GET /admin/students/:id/results: this term as it stands (null once they've left), and every
 * published term before it, oldest first. A past term's card is at
 * GET /admin/students/:id/report-cards/:termId; this term's at GET /admin/report-cards/:studentId.
 */
export type StudentResults = {
  current: {
    term: TermRef;
    armName: string;
    published: boolean;
    subjects: { subjectId: string; subjectName: string; status: EntryState; total: number | null; complete: boolean; grade: string | null }[];
    /** Once every subject is complete. */
    average: number | null;
    position: number | null;
    of: number;
  } | null;
  past: TermResult[];
};

/** POST /admin/students/:id/notes; DELETE /admin/students/:id/notes/:noteId */
export type AddStudentNoteRequest = { text: string };

/** POST /admin/students/:id/photo (multipart, field `photo`) and DELETE /admin/students/:id/photo. */
export type StudentPhotoResponse = { photoUrl: string | null };

/**
 * POST /admin/students: enrols one student into an arm for the current session. A blank
 * `admissionNo` takes the next number in the school's format. `inviteParent` emails the guardian
 * an invite (needs `guardian.email`).
 */
export type EnrolStudentRequest = {
  fullName: string;
  gender: Gender | null;
  dob: string | null;
  armId: string;
  admissionNo: string | null;
  joinedOn: string;
  guardian: GuardianDetails;
  inviteParent: boolean;
};
export type EnrolStudentResponse = { student: StudentRecord; parentInvited: boolean };

/** PUT /admin/students/:id: corrects details. A new `armId` moves them to another class, scores and all. */
export type UpdateStudentRequest = Omit<EnrolStudentRequest, "inviteParent" | "admissionNo"> & { admissionNo: string };

/** POST /admin/students/:id/leave: they keep their record and results, and drop off class lists and score sheets. */
export type LeaveSchoolRequest = { status: Exclude<StudentStatus, "ACTIVE">; on: string; reason: string | null };

/** POST /admin/students/:id/readmit: back to ACTIVE, in their last class. No body. */

// ---- Importing a whole list (DECISIONS.md F-41) ----

/** One row of the school's list once its columns are matched, with each cell as written. */
export type ImportRow = {
  fullName: string;
  className: string;
  admissionNo: string;
  gender: string;
  dob: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
};
export type ImportRowField = keyof ImportRow;

/**
 * POST /admin/students/import. With `check: true` nothing is saved: every row comes back READY or
 * PROBLEM. Without it, READY rows are enrolled (ENROLLED) and the rest skipped, so a list can be
 * fixed and imported again. Rows already in the school come back as problems, never twice.
 */
export type ImportStudentsRequest = { rows: ImportRow[]; check: boolean; inviteParents: boolean; joinedOn: string };

export type ImportRowResult = {
  /** Index into the request's rows. */
  row: number;
  status: "READY" | "PROBLEM" | "ENROLLED";
  problems: Partial<Record<ImportRowField, string>>;
  /** The arm the class cell matched. */
  armName: string | null;
  /** As given, or the number the student gets (a preview while checking). */
  admissionNo: string | null;
};

export type ImportStudentsResponse = {
  results: ImportRowResult[];
  ready: number;
  problems: number;
  enrolled: number;
  parentsInvited: number;
};

/** The most rows one import takes. */
export const MAX_IMPORT_ROWS = 2000;

/**
 * GET and PUT /admin/admission-numbers. `next` is the running count. Read-only: `year` is the
 * session's first year, which {YEAR} becomes; `preview` is what the next student gets.
 */
export type AdmissionNumberSettings = { pattern: string; digits: number; next: number; year?: number; preview?: string };

/** POST /admin/students/:id/invite-parent */
export type InviteParentRequest = { fullName: string; email: string };

/** GET /admin/staff */
export type StaffMember = {
  id: string;
  fullName: string;
  email: string;
  role: "TEACHER" | "SCHOOL_ADMIN";
  status: "ACTIVE" | "INVITED";
  subjects: string[];
  sheetsTotal: number;
  sheetsComplete: number;
};

/** POST /users/invite (built in the API, F-26). */
export type InviteStaffRequest = { fullName: string; email: string; role: "TEACHER" | "SCHOOL_ADMIN"; phone?: string };

/**
 * GET and PUT /admin/school. `logoUrl` is read-only here: it changes through
 * POST /admin/school/logo (multipart, field `logo`; returns SchoolLogoResponse) and DELETE /admin/school/logo.
 */
export type SchoolProfile = { name: string; motto: string | null; address: string | null; logoUrl?: string | null };
export type SchoolLogoResponse = { logoUrl: string | null };

/** GET and PUT /admin/term */
export type TermDates = { startsOn: string; endsOn: string; scoresDueOn: string; nextTermBegins: string | null };

/** GET and PUT /admin/grading-scale (scoped to the session, F-2). */
export type GradingScaleBody = { bands: GradeBand[] };

// ---- The school year (DECISIONS.md F-43) ----

export type TermStatus = "CLOSED" | "CURRENT" | "UPCOMING";
export type SessionTerm = { id: string; name: string; status: TermStatus; startsOn: string | null; endsOn: string | null; closedOn: string | null };

/** GET /admin/session: this session's terms, and the classes not yet published this term. */
export type SessionInfo = {
  name: string;
  terms: SessionTerm[];
  unpublishedArms: { id: string; name: string }[];
};

/**
 * POST /admin/session/close-term: closes the current term and starts the next one with `next`'s
 * dates. Closing locks every score; results stay on students' records and, where published, with
 * parents. Refused (409) while classes are unpublished, unless `closeUnpublished`. The last term of
 * a session closes through promotion instead (F-44).
 */
export type CloseTermRequest = { next: TermDates; closeUnpublished: boolean };
export type CloseTermResponse = { closed: TermRef; started: TermRef };

// ---- Promotion at the end of a session (DECISIONS.md F-44) ----

export type PromotionDecision = "PROMOTE" | "REPEAT" | "GRADUATE";

export type PromotionStudent = {
  id: string;
  fullName: string;
  admissionNo: string;
  /** The average of this session's term averages; null when no term has results. */
  yearlyAverage: number | null;
  termsCounted: number;
  /** What the pass mark suggests: final-year students graduate, others move up at or above it. */
  suggested: PromotionDecision;
  decision: PromotionDecision;
  reason: string | null;
  /** Where they'll be next session; null for graduates. */
  destination: string | null;
};

/**
 * GET /admin/promotion: every current student by class, with the suggested decision and any change
 * made by hand. `passMark` null means the grading scale's lowest pass grade.
 */
export type PromotionPlan = {
  sessionName: string;
  nextSessionName: string;
  passMark: number;
  /** True only while the session's last term is the current one. */
  open: boolean;
  classes: { armId: string; armName: string; classOrder: number; students: PromotionStudent[] }[];
  counts: Record<PromotionDecision, number>;
  unpublishedArms: { id: string; name: string }[];
};

/** PUT /admin/promotion/pass-mark */
export type PassMarkRequest = { passMark: number };
/** PUT /admin/promotion/students/:id. Choosing the suggested decision clears the change. */
export type PromotionChangeRequest = { decision: PromotionDecision; reason: string | null };

/**
 * POST /admin/promotion/complete: closes the last term, moves everyone as decided (graduates leave
 * with status GRADUATED), and starts the next session's first term on `firstTerm`'s dates.
 */
export type CompletePromotionRequest = { firstTerm: TermDates; closeUnpublished: boolean };
export type CompletePromotionResponse = { sessionName: string; promoted: number; repeating: number; graduated: number };

// ---- Getting a new school set up (Onboarding Flow §3, DECISIONS.md F-39) ----
// The Brillanda team creates the school with working defaults (F-36); nothing here blocks using it.

/** What the remaining setup checklist can hold, in the order it is shown. */
export type SetupItemId = "IMPORT_STUDENTS" | "INVITE_TEACHERS" | "CHECK_GRADING" | "UPLOAD_LOGO" | "SET_TERM";

/** GET /admin/setup */
export type SetupStatus = {
  /** False until the admin has tried one class or skipped ahead; the portal opens the first run until then. */
  firstRunDone: boolean;
  /** The defaults the school was created with, for the welcome screen. */
  defaults: {
    sessionName: string;
    terms: string[];
    classes: string[];
    arms: string[];
    subjects: string[];
    components: ScoreSheetComponent[];
    gradingScale: GradeBand[];
  };
  checklist: { id: SetupItemId; done: boolean }[];
  /** The admin hid the checklist before finishing it. */
  checklistHidden: boolean;
};

/**
 * POST /admin/setup/try-class: adds a few students to one arm, with placeholder admission numbers
 * the school corrects later, and returns the sheet to try. Scores then save through
 * PUT /scores/:studentId/:componentId like any other sheet; a school admin may enter scores for
 * their own school.
 */
export type TryClassRequest = { armId: string; subjectId: string; studentNames: string[] };
export type TryClassResponse = { sheet: ScoreSheet };

/** POST /admin/setup/first-run: the admin finished trying a class, or skipped it. No body. */
/** POST /admin/setup/checklist/hide and /show. No body. */
