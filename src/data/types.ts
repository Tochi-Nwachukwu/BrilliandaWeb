// Shapes shared by every data function (docs/data-contract.md).
import type { BookItem } from "@brillianda/core/booklists";
import type { Term } from "@brillianda/core/calendar";
import type { CorrectableField } from "@brillianda/core/corrections";
import type { Scored, TestSettings, Where } from "@brillianda/core/cbt";
import type { Question, Response } from "@brillianda/core/questions";
import type { Day, Period } from "@brillianda/core/timetable";
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
  /** The email already has a Brillianda account (a second campus): the last step asks for its password. */
  existingAccount: boolean;
};

/** The answer to "can we have this address?" while the owner types. */
export type SubdomainCheck =
  | { available: true; subdomain: string }
  | { available: false; subdomain: string; reason: "taken" | "reserved" | "invalid"; message: string; suggestions: string[] };

export type SchoolRole = "owner" | "admin" | "teacher" | "parent" | "student";

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

export type InviteDetails = { schoolName: string; fullName: string; email: string; status: "open" | "used" | "expired"; hasAccount: boolean; role: "admin" | "teacher" | "parent" | "student" };

/**
 * What the email said, so screens can be clicked through without an inbox: the fakes make it up;
 * on staging it comes from the API’s outbox (`fromOutbox`; src/data/api/outbox.ts). Production
 * never returns it. A `code` is shown as text, not a link.
 */
export type SampleEmail = { sampleLinks?: { label: string; href: string; fromOutbox?: boolean; code?: string }[] };

/** The school's current session and its terms. `confirmed` is false until someone saves it. */
export type SessionSetup = { startYear: number; name: string; terms: Term[]; confirmed: boolean };

/** The plan's setup checklist, in its order. */
export type SetupItemId = "branding" | "calendar" | "classes" | "arms" | "subjects" | "students" | "admins";
export type SetupProgress = { items: { id: SetupItemId; done: boolean }[]; hidden: boolean };

/** One line of the school's record of changes. */
export type ChangeEntry = { id: string; at: number; who: string; what: string };

/** Narrowing the change history. Days are ISO dates in Lagos time, both ends included. */
export type ChangeFilter = { who?: string; search?: string; from?: string; to?: string; studentId?: string; limit?: number };

/** A page of the change history: newest first, how many match in all, and who to filter by. */
export type ChangeLog = {
  entries: (ChangeEntry & { student: { id: string; name: string } | null })[];
  total: number;
  people: string[];
  /** Set when the filter names a student, so the page can say whose history this is. */
  student: { id: string; name: string } | null;
};

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
  guardian: { id: string; name: string; phone: string | null; email: string | null; siblings: { id: string; fullName: string; armLabel: string }[]; parentAccess: ParentAccess } | null;
  classHistory: { armLabel: string; from: string }[];
  changes: ChangeEntry[];
  /** This term's register marks (batch 11). */
  attendance: AttendanceSummary;
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

// ——— Teachers and the daily register (batch 11) ———

export type RegisterMark = "present" | "late" | "absent";

/** A teacher on the Teachers page: who they are and what they teach. */
export type TeacherSummary = {
  id: string;
  fullName: string;
  email: string;
  status: "active" | "invited";
  invitedAt?: number;
  formArms: { armId: string; label: string }[];
  subjectClasses: { armId: string; subjectId: string; label: string }[];
};
export type TeachersPage = {
  teachers: TeacherSummary[];
  arms: { id: string; label: string; formTeacherId: string | null }[];
  subjects: { id: string; name: string; code: string }[];
};

/** One arm's register for one day. */
export type Register = {
  armId: string;
  armLabel: string;
  date: string;
  /** Why this day can't be marked (a weekend, outside the term); null if it can. */
  problem: string | null;
  taken: { by: string; at: number; updatedBy?: string; updatedAt?: number } | null;
  students: { id: string; fullName: string; admissionNo: string; mark: RegisterMark | null; note: string }[];
  /** This term's school days so far, newest first, and whether each was taken. */
  days: { date: string; taken: boolean }[];
};

/** A teacher's home: their form classes and the subjects they teach. */
export type TeacherHome = {
  fullName: string;
  /** Today, when it's a school day; null at weekends and in breaks. */
  today: string | null;
  formArms: { armId: string; label: string; students: number; takenToday: boolean; takenThisTerm: number; daysThisTerm: number }[];
  subjects: { armId: string; subjectId: string; label: string; subjectName: string; students: number }[];
};

/** The students in one subject class, for its teacher. */
export type SubjectClass = { armLabel: string; subjectName: string; students: { id: string; fullName: string; admissionNo: string }[] };

/** Home's register card for admins: today's registers. */
export type RegistersToday = { date: string | null; taken: number; total: number; missing: { armId: string; label: string }[] };

// ——— Parents (batch 12) ———

/** Whether a guardian uses the parent app: not invited, invited, or signed up. */
export type ParentAccess = "none" | "invited" | "active";

/** More › Parents: every guardian, their children, and their parent-app status. */
export type ParentsPage = {
  guardians: { id: string; name: string; email: string | null; phone: string | null; children: { id: string; fullName: string; armLabel: string }[]; access: ParentAccess }[];
};

/** One child, as their parent sees them. Register notes stay with the school. */
export type ParentChild = {
  id: string;
  fullName: string;
  armLabel: string;
  admissionNo: string;
  formTeacher: string | null;
  attendance: AttendanceSummary;
  /** The latest school days this term, newest first. */
  recent: { date: string; mark: RegisterMark | null }[];
  /** This term's results, once the class is published (batch 16); otherwise just the term's name. */
  results: { term: string; published: false } | { term: string; published: true; average: number | null; position: number | null; of: number } | null;
  /** Closed terms whose results were published (group 3), newest first. */
  pastTerms: { key: string; label: string }[];
  /** On the child’s birthday, when the school sends birthday messages (batch 19): the school’s message. */
  birthday: string | null;
  /** Shared book lists (batch 20): this session’s class, and the class they move into next session. */
  bookLists: { label: string; list: BookList }[];
  /** The child’s record (batch 21; null where it isn’t available yet), and the parent’s correction requests, newest first. */
  details: ChildDetails | null;
  corrections: CorrectionRow[];
};
export type ParentHome = { fullName: string; schoolDay: boolean; children: ParentChild[] };

/** A student's attendance this term (late counts as present). */
export type AttendanceSummary = { term: string; days: number; present: number; late: number; absent: number } | null;

// ——— The Brillianda team console (batch 13) ———

export type TeamMember = { id: string; fullName: string; email: string };
export type TrialStatus = "new" | "contacted" | "converted" | "declined";

/** One school as the team sees it: counts and contacts, never a student's own record. */
export type ConsoleSchool = {
  subdomain: string;
  name: string;
  status: "active" | "suspended" | "archived";
  createdAt: number | null;
  owner: { fullName: string; email: string } | null;
  students: number;
  classes: number;
  setupDone: number;
  setupTotal: number;
};

export type ConsoleSchoolDetail = ConsoleSchool & {
  state: string | null;
  phone: string | null;
  levelsOffered: string[];
  admins: number;
  teachers: number;
  parents: number;
  subjects: number;
  setup: { label: string; done: boolean }[];
  /** Why it was last paused or reactivated, by whom. */
  statusNote: { status: "active" | "suspended"; reason: string; by: string; at: number } | null;
};

export type ConsoleOverview = {
  schools: { active: number; suspended: number; newThisWeek: number };
  students: number;
  trialsWaiting: number;
  recentSchools: ConsoleSchool[];
  activity: { at: number; who: string; what: string; subdomain?: string }[];
};

export type TrialRequestRow = {
  id: string;
  at: number;
  schoolName: string;
  contactName: string;
  role: string;
  email: string;
  phone: string;
  studentCount: number;
  state: string | null;
  interests: string[];
  message: string | null;
  status: TrialStatus;
  note: string | null;
};

// ——— Results (batch 14) ———

export type SheetStatus = "not-started" | "in-progress" | "complete";
export type UnlockRequest = { id: string; by: string; reason: string; at: number };

/** The term results are being entered for: "First Term, 2026/2027". */
export type ResultsTerm = { key: string; name: string; session: string; /** Its place in the session (0-based), and whether it's the last (closed through promotion). */ index: number; isLast: boolean };

export type ResultsSettingsData = {
  components: { id: string; name: string; maxScore: number }[];
  scale: { minScore: number; grade: string; remark: string; isPass: boolean }[];
  showPositions: boolean;
  /** Parts can't change once scores are in this term (names and the scale always can). */
  scoresEntered: boolean;
};

/** One subject's sheet for one arm, as a line in a list. */
export type SheetSummary = {
  armId: string;
  armLabel: string;
  subjectId: string;
  subjectName: string;
  kind: "compulsory" | "elective";
  teacher: string | null;
  status: SheetStatus;
  complete: number;
  of: number;
  unlockRequest: UnlockRequest | null;
};

/** A score sheet to fill in: every student who takes the subject, with each part's score. */
export type ScoreSheetData = {
  term: ResultsTerm;
  armId: string;
  armLabel: string;
  subjectId: string;
  subjectName: string;
  kind: "compulsory" | "elective";
  components: { id: string; name: string; maxScore: number }[];
  scale: { minScore: number; grade: string; remark: string; isPass: boolean }[];
  status: SheetStatus;
  /** Admins can always edit; a teacher until the sheet is marked complete. */
  canEdit: boolean;
  isAdmin: boolean;
  completedBy: { by: string; at: number } | null;
  unlockRequest: UnlockRequest | null;
  rows: { studentId: string; fullName: string; admissionNo: string; excluded: boolean; scores: Partial<Record<string, { value: number; isAbsent: boolean }>> }[];
};

/** Admin's Results page: each class's sheets this term, and unlock requests waiting. */
export type ResultsOverview = {
  term: ResultsTerm | null;
  /** When no term is open: the next one, opening on its start date. */
  next: { name: string; startsOn: string } | null;
  arms: { armId: string; label: string; sheets: number; complete: number; inProgress: number }[];
  requests: (UnlockRequest & { armId: string; armLabel: string; subjectId: string; subjectName: string })[];
};

// ——— Results: broadsheet, remarks, ratings, publishing, report cards (batch 15) ———

export type SubjectCell = { total: number; grade: string } | "excluded" | null;

/** A class's broadsheet: every student against every subject, with average and position. */
export type Broadsheet = {
  term: ResultsTerm;
  armId: string;
  armLabel: string;
  showPositions: boolean;
  subjects: { id: string; name: string; code: string; status: SheetStatus }[];
  rows: { studentId: string; fullName: string; admissionNo: string; cells: Record<string, SubjectCell>; average: number | null; position: number | null }[];
  allComplete: boolean;
  published: { by: string; at: number } | null;
  /** Owners and admins can publish; the form teacher only reads. */
  canPublish: boolean;
};

/** Remarks and ratings for a class, to fill in. */
export type ClassReports = {
  term: ResultsTerm;
  armId: string;
  armLabel: string;
  ratings: { enabled: boolean; traits: string[] };
  /** Admins write both remarks; the form teacher writes the class teacher's remark and ratings. */
  canWritePrincipal: boolean;
  rows: { studentId: string; fullName: string; teacherRemark: string; principalRemark: string; ratings: Record<string, number> }[];
};

/** One student's report card for a term. */
export type ReportCardData = {
  school: { name: string; logoUrl: string | null; brandColor: string };
  term: ResultsTerm;
  student: { id: string; fullName: string; admissionNo: string; armLabel: string };
  components: { id: string; name: string; maxScore: number }[];
  subjects: { name: string; scores: Record<string, { value: number; isAbsent: boolean } | null>; total: number | null; grade: string | null; remark: string | null }[];
  average: number | null;
  position: number | null;
  of: number;
  showPositions: boolean;
  attendance: AttendanceSummary;
  ratings: { trait: string; value: number | null }[];
  teacherRemark: string | null;
  principalRemark: string | null;
  formTeacher: string | null;
  nextTermBegins: string | null;
  scale: { minScore: number; grade: string; remark: string; isPass: boolean }[];
  published: boolean;
};

// ——— Running the school year (group 3) ———

/** Sessions and terms page: the term open for results, what closing it would leave out, and past terms. */
export type TermStatusData = {
  open: ResultsTerm | null;
  /** The term after the open one, whose dates can be adjusted when closing. */
  following: { name: string; startsOn: string; endsOn: string } | null;
  /** When no term is open: the next one, which opens on its start date. */
  waiting: { name: string; startsOn: string } | null;
  unpublished: { armId: string; label: string }[];
  closed: { key: string; name: string; session: string; by: string; at: number }[];
};

/** A term a student has results in. */
export type ReportTerm = { key: string; name: string; session: string; published: boolean; open: boolean };

/** Promotion at the end of the session (batch 18). */
export type PromotionDecision = "promote" | "repeat" | "graduate";
export type PromotionStudentRow = {
  id: string;
  fullName: string;
  admissionNo: string;
  yearlyAverage: number | null;
  termsCounted: number;
  suggested: PromotionDecision;
  decision: PromotionDecision;
  reason: string | null;
  /** Next session's class; null for graduates. */
  destination: string | null;
};
export type PromotionPlan = {
  sessionName: string;
  nextSessionName: string;
  passMark: number;
  /** True only while the session's last term is the one open for results. */
  open: boolean;
  lastTerm: string;
  classes: { armId: string; label: string; finalClass: boolean; students: PromotionStudentRow[] }[];
  counts: Record<PromotionDecision, number>;
  unpublished: { armId: string; label: string }[];
  /** The next session's suggested first term, for the dialog. */
  firstTerm: { name: string; startsOn: string; endsOn: string };
};

// ——— Birthdays (batch 19) ———

/** A student whose birthday is coming, for the school. */
export type BirthdayRow = { studentId: string; fullName: string; armLabel: string; on: string; inDays: number; turns: number; guardianPhone: string | null };

/** More › Birthdays: the school's message, who's next, and what went out. */
export type BirthdaysPage = {
  settings: { enabled: boolean; message: string };
  schoolName: string;
  today: string;
  /** The next 30 days, today first. */
  upcoming: BirthdayRow[];
  /** The latest texts sent, newest first. `to` is null when the guardian has no phone on file. */
  sent: { id: string; date: string; fullName: string; armLabel: string; to: string | null; text: string }[];
};

/** Home's card: birthdays in the next 7 days. */
export type BirthdaysThisWeek = { enabled: boolean; rows: BirthdayRow[] };

// ——— Books and things needed (batch 20) ———

/** One class level's list for one session. Parents see it once it's shared. */
export type BookList = {
  levelId: string;
  levelName: string;
  startYear: number;
  session: string;
  items: (BookItem & { id: string })[];
  shared: boolean;
  updated: { by: string; at: number } | null;
};

/** More › Book lists: every class level's list for one session, and the sessions to choose from. */
export type BookListsPage = { startYear: number; session: string; sessions: { startYear: number; name: string; label: string }[]; lists: BookList[] };

// ——— Biodata and corrections (batch 21) ———

/** A child's details as their parent sees them. */
export type ChildDetails = {
  firstName: string;
  otherNames: string;
  lastName: string;
  dateOfBirth: string;
  gender: StudentGender;
  admissionDate: string;
  stateOfOrigin: string;
  address: string;
  guardian: { name: string; phone: string | null; email: string | null } | null;
};

/** One request to correct a child's details. `from` is what the record said when it was asked. */
export type CorrectionRow = {
  id: string;
  at: number;
  studentId: string;
  studentName: string;
  armLabel: string;
  by: string;
  changes: { field: CorrectableField; from: string; to: string }[];
  note: string;
  status: "open" | "approved" | "declined";
  decided: { by: string; at: number; reason: string | null } | null;
};

/** More › Corrections: waiting first, then the latest answered. */
export type CorrectionsPage = { open: CorrectionRow[]; answered: CorrectionRow[] };

// ——— Timetable (batch 22) ———

/** One lesson, with the class's teacher for that subject (null until one is set in Teachers). */
export type TimetableLesson = { armId: string; day: Day; periodId: string; subjectId: string; teacherId: string | null; teacherName: string | null };

/** The school's timetable, for staff. Teachers see every class, with their own lessons marked by `me`. */
export type TimetablePage = {
  periods: Period[];
  arms: { id: string; label: string; levelId: string }[];
  /** The school's subjects, and which class levels take each (for the editor's choices). */
  subjects: { id: string; name: string; code: string; levelIds: string[] }[];
  lessons: TimetableLesson[];
  /** A teacher in two classes at once. */
  clashes: { teacherName: string; day: Day; periodId: string; armLabels: string[] }[];
  /** An uploaded timetable document (a PDF): opened as it is, nothing highlighted. */
  file: { name: string; size: number; url: string; by: string; at: number } | null;
  me: { userId: string; canEdit: boolean };
};

// ——— Students and the student portal (batch 23) ———

export type StudentAccess = "none" | "invited" | "active";

/** More › Student accounts: every active student, and whether they use the student portal. */
export type StudentAccountsPage = {
  students: { id: string; fullName: string; admissionNo: string; armId: string; armLabel: string; access: StudentAccess; email: string | null }[];
  arms: { id: string; label: string }[];
};

/** A student's own home: who they are, today's lessons, attendance, results and book lists. */
export type StudentHome = {
  fullName: string;
  armLabel: string;
  admissionNo: string;
  formTeacher: string | null;
  birthday: string | null;
  /** Today's lessons, in order; empty at weekends or when the timetable has none. */
  lessonsToday: { periodLabel: string; start: string; end: string; subjectName: string }[];
  attendance: AttendanceSummary;
  recent: { date: string; mark: RegisterMark | null }[];
  results: ParentChild["results"];
  pastTerms: { key: string; label: string }[];
  bookLists: { label: string; list: BookList }[];
};

/** A student's class week. */
export type ClassTimetable = { armLabel: string; periods: Period[]; lessons: { day: Day; periodId: string; subjectName: string; teacherName: string | null }[] };

// ——— The question bank and generating questions (batch 24) ———

export type BankQuestion = { id: string; subjectId: string; levelId: string; question: Question; source: "ai" | "teacher"; by: string; byMe: boolean; at: number };

/** The questions a person can see and write: a teacher's own subjects and classes; everything for admins. */
export type QuestionBankPage = {
  /** Subject and class level pairs this person may write questions for. */
  pairs: { subjectId: string; subjectName: string; levelId: string; levelName: string }[];
  questions: BankQuestion[];
  /** This month's AI generations: used, the school's allowance, and when it resets. */
  usage: { used: number; limit: number; resetsOn: string };
  canEditAll: boolean;
};

// ——— CBT: tests on Brillianda (batch 25) ———

/** One test, as its teacher (or an admin) sees it in the list. */
export type TestRow = {
  id: string;
  title: string;
  subjectName: string;
  levelName: string;
  armLabels: string[];
  questions: number;
  marks: number;
  durationMinutes: number;
  opensAt: string;
  closesAt: string;
  where: Where;
  status: "draft" | "published";
  /** Before, during or after its window. */
  window: "before" | "open" | "closed";
  submitted: number;
  students: number;
  /** Theory answers still to mark. */
  toMark: number;
  sentAt: number | null;
  by: string;
  byMe: boolean;
};

/** Setting or changing a test: what can go in it. */
export type TestEditorData = {
  pairs: { subjectId: string; subjectName: string; levelId: string; levelName: string; arms: { id: string; label: string }[] }[];
  bank: BankQuestion[];
  components: { id: string; name: string; maxScore: number }[];
  /** The test being changed (drafts only), or null for a new one. */
  test: (TestSettings & { id: string; subjectId: string; levelId: string }) | null;
};

/** A test's results, for marking and sending scores. */
export type TestResults = {
  test: TestRow & { accessCode: string; showScore: boolean; component: { id: string; name: string; maxScore: number } | null; questionList: Question[] };
  rows: {
    studentId: string;
    fullName: string;
    armLabel: string;
    state: "not started" | "in progress" | "submitted";
    attemptId: string | null;
    score: Scored | null;
    leftPage: number;
    responses: Record<number, Response>;
    theoryMarks: Record<number, number>;
  }[];
  /** For each question: how many answered it, and how many got it right (theory: null). */
  stats: { answered: number; right: number | null }[];
};

/** A test in a student's list. */
export type StudentTestRow = {
  id: string;
  title: string;
  subjectName: string;
  durationMinutes: number;
  questions: number;
  opensAt: string;
  closesAt: string;
  where: Where;
  window: "before" | "open" | "closed";
  attempt: "none" | "in progress" | "submitted";
  /** Shown once submitted, when the teacher allows it: the objective score, or the full score once marked. */
  score: { total: number; max: number; complete: boolean } | null;
};

/** A test being taken: questions in this student's order, without answers. */
export type TakingTest = {
  id: string;
  title: string;
  instructions: string;
  subjectName: string;
  durationMinutes: number;
  where: Where;
  /** Null until started. Milliseconds since 1970. */
  deadline: number | null;
  submitted: boolean;
  questions: { index: number; type: Question["type"]; text: string; marks: number; options: { index: number; text: string }[] }[];
  responses: Record<number, Response>;
};
