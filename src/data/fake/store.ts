// FAKE: sample data for every fake data function, kept in memory on the server until the backend
// replaces it (docs/data-contract.md). It resets when the dev server restarts. Kept on globalThis
// so a hot reload in development doesn't wipe it.
import "server-only";
import { DEFAULT_BIRTHDAY_MESSAGE } from "@brillianda/core/birthdays";
import type { BookItem } from "@brillianda/core/booklists";
import type { CorrectableField } from "@brillianda/core/corrections";
import { defaultTerms, type Term } from "@brillianda/core/calendar";
import { armCodes, ARM_PRESETS, buildLadder, type Department, type Section } from "@brillianda/core/classes";
import { type SchoolDetails, type SchoolLevel } from "@brillianda/core/signup";
import { type StudentGender, type StudentStatus } from "@brillianda/core/students";
import { defaultLinks, preTicked, type LinkKind } from "@brillianda/core/subjects";
import type { SchoolSummary } from "../types";
import { CATALOGUE } from "./catalogue";

type FakeStore = {
  schools: SchoolSummary[];
  trialRequests: FakeTrialRequest[];
  /** Batch 13: the Brillianda team, their sessions, and what the console knows about each school. */
  teamUsers: { id: string; fullName: string; email: string; password: string }[];
  teamSessions: Map<string, { teamUserId: string }>;
  schoolMeta: Map<string, { createdAt: number; statusNote?: { status: "active" | "suspended"; reason: string; by: string; at: number } }>;
  /** What the team did, for the console's activity list. */
  teamLog: { at: number; who: string; what: string; subdomain?: string }[];
  signupDrafts: Map<string, FakeSignupDraft>;
  users: FakeUser[];
  sessions: Map<string, { userId: string }>;
  /** One-time passes from signup to the new school's address (60 seconds, used once). */
  handovers: Map<string, { userId: string; subdomain: string; createdAt: number }>;
  invites: FakeInvite[];
  links: Map<string, FakeLink>;
  calendars: Map<string, { confirmed: boolean; startYear: number; terms: Term[] }>;
  checklistHidden: Set<string>;
  /** Batch 11: one form teacher per arm; subject teachers per arm and subject. */
  formTeachers: { armId: string; userId: string }[];
  subjectTeachers: { armId: string; subjectId: string; userId: string }[];
  /** A register taken for one arm on one day, and each student's mark in it. */
  registers: { armId: string; date: string; takenBy: string; takenAt: number; updatedBy?: string; updatedAt?: number }[];
  marks: { armId: string; date: string; studentId: string; mark: "present" | "late" | "absent"; note?: string }[];
  /** Batch 14: each school's results settings (default: CA1 20, CA2 20, Exam 60; A to F; positions on). */
  resultsSettings: Map<string, { components: { id: string; name: string; maxScore: number }[]; scale: { minScore: number; grade: string; remark: string; isPass: boolean }[]; showPositions: boolean }>;
  /** One score per student, part, subject, arm and term (`term` is "<session start year>-<term number>"). */
  scores: { term: string; armId: string; subjectId: string; studentId: string; componentId: string; value: number; isAbsent: boolean }[];
  /** Sheets marked complete (locked for teachers until unlocked). */
  completeSheets: { term: string; armId: string; subjectId: string; by: string; at: number }[];
  /** Students who don't take an elective. */
  exclusions: { term: string; armId: string; subjectId: string; studentId: string }[];
  unlockRequests: { id: string; term: string; armId: string; subjectId: string; by: string; reason: string; at: number; status: "open" | "approved" | "declined" }[];
  resultsSeeded: boolean;
  /** Batch 15: behaviour ratings (off unless a school turns them on), remarks, ratings, published classes. */
  ratingSettings: Map<string, { enabled: boolean; traits: string[] }>;
  remarks: { term: string; studentId: string; kind: "teacher" | "principal"; text: string; by: string; at: number }[];
  ratings: { term: string; studentId: string; trait: string; value: number }[];
  publishedArms: { term: string; armId: string; by: string; at: number }[];
  /** Batch 17: terms closed for results (scores locked), with their names kept for later sessions. */
  closedTerms: { subdomain: string; key: string; name: string; session: string; by: string; at: number }[];
  /** Batch 18: each school's promotion pass mark (default: the lowest passing grade) and decisions changed by hand. */
  promotion: Map<string, { passMark?: number; overrides: { studentId: string; decision: "promote" | "repeat" | "graduate"; reason: string | null }[] }>;
  /** Batch 12: a parent's account and the guardian record it belongs to (their children). */
  parentLinks: { userId: string; guardianId: string }[];
  /** Sample registers are made on first read, from that day's date (see fake/teaching.ts). */
  registersSeeded: boolean;
  /** Schools whose owner has saved More › Branding (ticks the checklist item). */
  brandingSaved: Set<string>;
  /** at <= 0 means "that many minutes before the first read" (see fake/home.ts). */
  changes: { id: string; subdomain: string; at: number; who: string; what: string; studentId?: string }[];
  /** What signup collected about each school that its pages don't show. */
  profiles: Map<string, { levelsOffered: SchoolLevel[]; state: string; phone: string }>;
  levels: { id: string; subdomain: string; key: string | null; name: string; short: string; section: Section; position: number; archived: boolean }[];
  armNames: { id: string; subdomain: string; name: string; code: string; position: number }[];
  arms: { id: string; subdomain: string; levelId: string; armNameId: string; department: Department | null; archived: boolean }[];
  students: FakeStudent[];
  guardians: { id: string; subdomain: string; name: string; phone: string | null; email: string | null }[];
  /** Each student's classes over time, newest last. */
  enrolments: { studentId: string; armId: string; from: string }[];
  /** Admission number format and the next running number (plan: a per-school counter). */
  admission: Map<string, { pattern: string; digits: number; next: number }>;
  subjects: { id: string; subdomain: string; catalogueId: string | null; name: string; code: string; position: number }[];
  subjectLinks: { subdomain: string; subjectId: string; levelId: string; kind: LinkKind; department: Department | null }[];
  /** Remembered column mappings, by school (plan: Brillianda remembers it for next time). */
  importMappings: Map<string, Record<string, string>>;
  importBatches: { id: string; subdomain: string; at: number; by: string; created: string[]; updated: number; fileName: string; undoneAt: number | null }[];
  /** Batch 19: each school's birthday messages, and the texts the daily job sent (one per child per day). */
  birthdaySettings: Map<string, { enabled: boolean; message: string }>;
  birthdayLog: { id: string; subdomain: string; studentId: string; date: string; to: string | null; text: string }[];
  /** Batch 20: books and things needed, per class level and session; parents see shared ones. */
  bookLists: { subdomain: string; startYear: number; levelId: string; items: (BookItem & { id: string })[]; shared: boolean; by: string; at: number }[];
  /** Batch 21: parents asking the school to correct their child’s details. */
  corrections: {
    id: string;
    subdomain: string;
    studentId: string;
    by: string;
    at: number;
    changes: { field: CorrectableField; from: string; to: string }[];
    note: string;
    status: "open" | "approved" | "declined";
    decided?: { by: string; at: number; reason: string | null };
  }[];
};

/** Greenfield's subjects: the 2025 junior and senior lists, attached by default. */
function seedGreenfieldSubjects(levels: { id: string; key: string | null; section: Section }[]) {
  const entries = CATALOGUE.filter((e) => preTicked(CATALOGUE, ["junior", "senior"]).includes(e.id));
  const subjects = entries.map((e, i) => ({ id: `gs-${e.id}`, subdomain: "greenfield", catalogueId: e.id, name: e.name, code: e.code, position: i }));
  const subjectLinks = defaultLinks(entries, levels).map((l) => ({ subdomain: "greenfield", subjectId: `gs-${l.entryId}`, levelId: l.levelId, kind: l.kind, department: l.department }));
  return { subjects, subjectLinks };
}

export type FakeStudent = {
  id: string;
  subdomain: string;
  armId: string;
  status: StudentStatus;
  firstName: string;
  lastName: string;
  otherNames: string;
  gender: StudentGender;
  dateOfBirth: string;
  admissionNo: string;
  admissionDate: string;
  address: string;
  stateOfOrigin: string;
  guardianId: string | null;
  createdAt: number;
  /** Delete is only for mistakes, and soft (plan). */
  deletedAt: number | null;
  /** Set by an import, so a whole batch can be undone (batch 9). */
  importBatchId: string | null;
  updatedAt: number;
};

const FIRST_F = ["Chiamaka", "Adaeze", "Fatima", "Ngozi", "Ọlá", "Zainab", "Ifeoma", "Aisha", "Temitọpẹ", "Halima", "Kemi", "Amarachi"];
const FIRST_M = ["Tunde", "Chinedu", "Ibrahim", "Emeka", "Ṣẹgun", "Musa", "Obinna", "Yusuf", "Kelechi", "Babatunde", "Sani", "Uche"];
const LAST = ["Okafor", "Bello", "Adéṣínà", "Eze", "Abubakar", "Ogunleye", "Nwosu", "Danjuma", "Afolabi", "Umeh", "Okonkwo", "Lawal", "Ibekwe", "Yusuf"];

/** Greenfield's students: four or five in each of its 18 classes, siblings sharing a guardian. */
function seedGreenfieldStudents(arms: { id: string; levelId: string }[]) {
  const guardians: FakeStore["guardians"] = [];
  const students: FakeStudent[] = [];
  const enrolments: FakeStore["enrolments"] = [];
  let n = 0;
  arms.forEach((arm, armIndex) => {
    const count = 4 + (armIndex % 2);
    for (let k = 0; k < count; k++, n++) {
      const female = n % 2 === 0;
      const last = LAST[n % LAST.length]!;
      // Every fourteenth student shares a family (and so a guardian) with one in an older class.
      const familyKey = last;
      let guardian = guardians.find((g) => g.name.endsWith(last) && n % 7 === 3);
      if (!guardian) {
        guardian = { id: `gg${n + 1}`, subdomain: "greenfield", name: `${n % 3 ? "Mrs" : "Mr"} ${familyKey}`, phone: `+23480300${String(10000 + n).slice(-5)}`, email: n % 4 ? null : `${last.toLowerCase().normalize("NFKD").replace(/[^a-z]/g, "")}${n}@example.com` };
        guardians.push(guardian);
      }
      const level = Number(arm.levelId.slice(2));
      const year = 2026 - (level - 1);
      const id = `st${n + 1}`;
      students.push({
        id,
        subdomain: "greenfield",
        armId: arm.id,
        status: n === 7 ? "suspended" : n === 23 ? "transferred" : "active",
        firstName: (female ? FIRST_F : FIRST_M)[n % 12]!,
        lastName: last,
        otherNames: n % 5 === 0 ? (female ? "Grace" : "David") : "",
        gender: female ? "FEMALE" : "MALE",
        dateOfBirth: `${2015 - level}-${String((n % 12) + 1).padStart(2, "0")}-${String((n % 27) + 1).padStart(2, "0")}`,
        admissionNo: `GC/${year}/${String(n + 1).padStart(4, "0")}`,
        admissionDate: `${year}-09-14`,
        address: n % 3 ? "" : `${(n % 40) + 1} Allen Avenue, Ikeja`,
        stateOfOrigin: ["Lagos", "Enugu", "Kano", "Oyo", "Rivers", "Anambra"][n % 6]!,
        guardianId: guardian.id,
        createdAt: 0,
        updatedAt: 0,
        deletedAt: null,
        importBatchId: null,
      });
      enrolments.push({ studentId: id, armId: arm.id, from: `${year}-09-14` });
    }
  });
  return { students, guardians, enrolments, next: n + 1 };
}

/** Greenfield's classes: JSS 1 to SS 3, three colour arms each. */
function seedGreenfieldClasses() {
  const levels = buildLadder("jss1", "ss3", "nigerian").map((l, i) => ({ id: `gl${i + 1}`, subdomain: "greenfield", key: l.key, name: l.name, short: l.short, section: l.section, position: i, archived: false }));
  const names = ARM_PRESETS.colours.names.slice(0, 3);
  const codes = armCodes([...names]);
  const armNames = names.map((name, i) => ({ id: `gn${i + 1}`, subdomain: "greenfield", name, code: codes[i]!, position: i }));
  const arms = levels.flatMap((level) => armNames.map((armName) => ({ id: `ga-${level.id}-${armName.id}`, subdomain: "greenfield", levelId: level.id, armNameId: armName.id, department: null, archived: false })));
  return { levels, armNames, arms };
}

/** A small school for the arms editor test: JSS 1 to 3 in Blue and Gold, one student in JSS 1 Blue. */
function seedArmsTestSchool(subdomain: string, student: FakeStudent) {
  const levels = buildLadder("jss1", "jss3", "nigerian").map((l, i) => ({ id: `${subdomain}-l${i + 1}`, subdomain, key: l.key, name: l.name, short: l.short, section: l.section, position: i, archived: false }));
  const armNames = [
    { id: `${subdomain}-n1`, subdomain, name: "Blue", code: "BLU", position: 0 },
    { id: `${subdomain}-n2`, subdomain, name: "Gold", code: "GOL", position: 1 },
  ];
  const arms = levels.flatMap((level) => armNames.map((armName) => ({ id: `${level.id}-${armName.id}`, subdomain, levelId: level.id, armNameId: armName.id, department: null, archived: false })));
  const pupil: FakeStudent = { ...student, id: `${subdomain}-st1`, subdomain, armId: arms[0]!.id, guardianId: null, admissionNo: "T/0001", importBatchId: null };
  return { levels, armNames, arms, students: [pupil] };
}

/** A trial request from the marketing site, and where the team is with it. `at` <= 0 is "minutes before the first read". */
export type FakeTrialRequest = {
  id: string;
  at: number;
  schoolName: string;
  contactName: string;
  role: string;
  email: string;
  phone: string;
  studentCount: number;
  state?: string;
  interests: string[];
  message?: string;
  status: "new" | "contacted" | "converted" | "declined";
  note?: string;
};

/** createdAt 0 means "sent just now"; filled in the first time it is read (see fake/auth.ts). */
export type FakeInvite = { id: string; token: string; subdomain: string; fullName: string; email: string; createdAt: number; usedAt?: number; role?: "admin" | "teacher" | "parent"; /** Parent invites: the guardian record they become. */ guardianId?: string };
/** Password reset and email sign-in links. */
export type FakeLink = { kind: "reset" | "magic"; userId: string; subdomain: string; createdAt: number; usedAt?: number };

/** A signup in progress. The password is only ever kept here, never sent back to a page. */
export type FakeSignupDraft = {
  school?: SchoolDetails;
  owner?: { fullName: string; email: string; password: string };
  codeSentAt?: number;
  emailVerified: boolean;
};

/** FAKE: plain-text passwords, because nothing here is real. Better Auth replaces all of this. */
export type FakeUser = { id: string; fullName: string; email: string; password: string; phone?: string; schools: { subdomain: string; role: "owner" | "admin" | "teacher" | "parent" }[] };

/** Greenfield's lists: JSS 1 for this session and JSS 2 for the next, shared; JSS 3's next one a draft. */
function seedBookLists(): FakeStore["bookLists"] {
  let n = 0;
  const item = (category: BookItem["category"], name: string, detail: string, quantity: number, price: number | null) => ({ id: `bk${++n}`, category, name, detail, quantity, price });
  return [
    {
      subdomain: "greenfield",
      startYear: 2026,
      levelId: "gl1",
      shared: true,
      by: "Amaka Obi",
      at: 0,
      items: [
        item("textbook", "New General Mathematics for JSS 1", "M. F. Macrae and others, Pearson", 1, 4200),
        item("textbook", "Intensive English for JSS 1", "Evans", 1, 3800),
        item("stationery", "20-leaf exercise books", "", 12, 250),
        item("uniform", "Sports wear", "House colour, from the school shop", 1, 6500),
      ],
    },
    {
      subdomain: "greenfield",
      startYear: 2027,
      levelId: "gl2",
      shared: true,
      by: "Amaka Obi",
      at: 0,
      items: [
        item("textbook", "New General Mathematics for JSS 2", "M. F. Macrae and others, Pearson", 1, 4500),
        item("textbook", "Basic Science for JSS 2", "STAN", 1, 3500),
        item("textbook", "Intensive English for JSS 2", "Evans", 1, null),
        item("stationery", "20-leaf exercise books", "", 12, 250),
        item("stationery", "Mathematical set", "", 1, 1500),
        item("uniform", "Blazer", "Navy, with the school badge", 1, 12000),
        item("other", "Ream of A4 paper", "For the class printer", 1, null),
      ],
    },
    { subdomain: "greenfield", startYear: 2027, levelId: "gl3", shared: false, by: "Amaka Obi", at: 0, items: [item("textbook", "New General Mathematics for JSS 3", "", 1, 4800)] },
  ];
}

function seed(): FakeStore {
  const greenfield = seedGreenfieldClasses();
  const greenfieldSubjects = seedGreenfieldSubjects(greenfield.levels);
  const greenfieldStudents = seedGreenfieldStudents(greenfield.arms);
  // One per screen size, so the two runs of the arms editor test never edit the same school.
  // harbourview: the school-year test school (closing a term, promotion), with a confirmed calendar.
  // seaview: the promotion test school, in its last term of 2025/2026 (first two terms closed).
  // Birthdays to show (batch 19): st1 (the sample parent's child) today, two more later this week.
  const lagosToday = new Date(Date.now() + 3_600_000).toISOString().slice(0, 10);
  const inDays = (n: number) => new Date(Date.parse(`${lagosToday}T12:00:00Z`) + n * 86_400_000).toISOString().slice(5, 10);
  for (const [id, n] of [["st1", 0], ["st6", 2], ["st11", 5]] as const) {
    const s = greenfieldStudents.students.find((x) => x.id === id);
    if (s) s.dateOfBirth = `${s.dateOfBirth.slice(0, 4)}-${inDays(n)}`;
  }
  const armsTests = ["elmwood", "willowbank", "harbourview", "seaview"].map((school) => seedArmsTestSchool(school, greenfieldStudents.students[0]!));
  // Greenfield's sample parent (batch 12): the guardian of its first student, in JSS 1 Blue.
  const sampleGuardian = greenfieldStudents.guardians.find((g) => g.id === greenfieldStudents.students[0]!.guardianId)!;
  sampleGuardian.email = "parent@greenfield.ng";
  // A second sample parent, for a JSS 2 Blue student: that class is ready to publish (batch 16).
  const jss2Guardian = greenfieldStudents.guardians.find((g) => g.id === greenfieldStudents.students.find((s) => s.armId === "ga-gl2-gn1" && s.guardianId !== sampleGuardian.id)!.guardianId)!;
  jss2Guardian.email = "parent2@greenfield.ng";
  return {
    schools: [
      { subdomain: "greenfield", name: "Greenfield College", status: "active", brandColor: "#4A3AA7", logoUrl: null },
      { subdomain: "surebloom", name: "Surebloom School", status: "active", brandColor: "#1E6B45", logoUrl: null },
      { subdomain: "closedschool", name: "Closed School", status: "suspended", brandColor: "#4A3AA7", logoUrl: null },
      { subdomain: "royalheights", name: "Royal Heights College", status: "active", brandColor: "#9A3B2E", logoUrl: null },
      { subdomain: "kingsway", name: "Kingsway Academy", status: "active", brandColor: "#0E6E8C", logoUrl: null },
      // Empty schools the browser tests set up from scratch (one per screen size).
      { subdomain: "brookfield", name: "Brookfield College", status: "active", brandColor: "#7A3E9D", logoUrl: null },
      { subdomain: "cedarwood", name: "Cedarwood High School", status: "active", brandColor: "#2F5D8A", logoUrl: null },
      // Fresh from signup (default colour, no logo), for the branding test, one per screen size.
      { subdomain: "oakridge", name: "Oakridge Academy", status: "active", brandColor: "#4A3AA7", logoUrl: null },
      { subdomain: "pinecrest", name: "Pinecrest School", status: "active", brandColor: "#4A3AA7", logoUrl: null },
      { subdomain: "elmwood", name: "Elmwood College", status: "active", brandColor: "#0E6E8C", logoUrl: null },
      { subdomain: "willowbank", name: "Willowbank College", status: "active", brandColor: "#7A1F35", logoUrl: null },
      // For the team console test: paused and brought back (batch 13).
      { subdomain: "lakeside", name: "Lakeside Grammar School", status: "active", brandColor: "#2F5D8A", logoUrl: null },
      { subdomain: "harbourview", name: "Harbourview College", status: "active", brandColor: "#1E6B45", logoUrl: null },
      { subdomain: "seaview", name: "Seaview Academy", status: "active", brandColor: "#0E6E8C", logoUrl: null },
    ],
    // Sample requests from the marketing site's trial form; minutes before the first read (see fake/console.ts).
    trialRequests: [
      { id: "tr1", at: -60 * 5, schoolName: "Bright Future Academy", contactName: "Uche Nnaji", role: "Proprietor", email: "uche@brightfuture.ng", phone: "08031234567", studentCount: 420, state: "Anambra", interests: ["Students", "Import"], status: "new" },
      { id: "tr2", at: -60 * 30, schoolName: "Crescent Model School", contactName: "Aisha Garba", role: "Principal", email: "aisha@crescentmodel.ng", phone: "08059876543", studentCount: 260, state: "Kano", interests: ["Attendance"], message: "We want to start next term.", status: "new" },
      { id: "tr3", at: -60 * 24 * 3, schoolName: "Riverside Comprehensive", contactName: "Tamuno Briggs", role: "Administrator", email: "tamuno@riverside.ng", phone: "08025551212", studentCount: 900, state: "Rivers", interests: ["Students"], status: "contacted", note: "Demo booked for Thursday." },
    ],
    teamUsers: [{ id: "t1", fullName: "Brillianda Support", email: "team@brillianda.com", password: "brillianda" }],
    teamSessions: new Map(),
    // When each sample school joined, in days before the first read; reasons for the paused one.
    schoolMeta: new Map([
      ["greenfield", { createdAt: -60 * 24 * 9 }],
      ["surebloom", { createdAt: -60 * 24 * 2 }],
      ["closedschool", { createdAt: -60 * 24 * 40, statusNote: { status: "suspended" as const, reason: "Asked to pause until fees are agreed.", by: "Brillianda Support", at: -60 * 24 * 5 } }],
    ]),
    teamLog: [],
    signupDrafts: new Map(),
    users: [
      { id: "u1", fullName: "Amaka Obi", email: "owner@greenfield.ng", password: "brillianda", schools: [{ subdomain: "greenfield", role: "owner" }] },
      { id: "u2", fullName: "Tunde Bello", email: "admin@greenfield.ng", password: "brillianda", schools: [{ subdomain: "greenfield", role: "admin" }, { subdomain: "surebloom", role: "admin" }] },
      { id: "u3", fullName: "Ngozi Eze", email: "owner@surebloom.ng", password: "brillianda", schools: [{ subdomain: "surebloom", role: "owner" }] },
      { id: "u4", fullName: "Bayo Adeyemi", email: "owner@royalheights.ng", password: "brillianda", schools: [{ subdomain: "royalheights", role: "owner" }] },
      { id: "u5", fullName: "Funke Ade", email: "owner@kingsway.ng", password: "brillianda", schools: [{ subdomain: "kingsway", role: "owner" }] },
      { id: "u6", fullName: "Emeka Nwosu", email: "owner@brookfield.ng", password: "brillianda", schools: [{ subdomain: "brookfield", role: "owner" }] },
      { id: "u7", fullName: "Halima Musa", email: "owner@cedarwood.ng", password: "brillianda", schools: [{ subdomain: "cedarwood", role: "owner" }] },
      { id: "u8", fullName: "Ifeoma Okeke", email: "owner@oakridge.ng", password: "brillianda", schools: [{ subdomain: "oakridge", role: "owner" }] },
      { id: "u9", fullName: "Musa Danjuma", email: "owner@pinecrest.ng", password: "brillianda", schools: [{ subdomain: "pinecrest", role: "owner" }] },
      { id: "u10", fullName: "Grace Etim", email: "owner@elmwood.ng", password: "brillianda", schools: [{ subdomain: "elmwood", role: "owner" }] },
      { id: "u11", fullName: "Sola Ajayi", email: "owner@willowbank.ng", password: "brillianda", schools: [{ subdomain: "willowbank", role: "owner" }] },
      { id: "u12", fullName: "Bisi Adebayo", email: "teacher@greenfield.ng", password: "brillianda", schools: [{ subdomain: "greenfield", role: "teacher" }] },
      { id: "u13", fullName: "Ifeanyi Okoro", email: "physics@greenfield.ng", password: "brillianda", schools: [{ subdomain: "greenfield", role: "teacher" }] },
      { id: "u14", fullName: sampleGuardian.name, email: "parent@greenfield.ng", password: "brillianda", schools: [{ subdomain: "greenfield", role: "parent" }] },
      { id: "u19", fullName: "Ese Okoro", email: "owner@seaview.ng", password: "brillianda", schools: [{ subdomain: "seaview", role: "owner" }] },
      { id: "u18", fullName: "Dapo Williams", email: "owner@harbourview.ng", password: "brillianda", schools: [{ subdomain: "harbourview", role: "owner" }] },
      { id: "u16", fullName: "Folake Adeyemi", email: "owner@lakeside.ng", password: "brillianda", schools: [{ subdomain: "lakeside", role: "owner" }] },
      { id: "u15", fullName: "Kemi Lawal", email: "english@greenfield.ng", password: "brillianda", schools: [{ subdomain: "greenfield", role: "teacher" }] },
      { id: "u17", fullName: jss2Guardian.name, email: "parent2@greenfield.ng", password: "brillianda", schools: [{ subdomain: "greenfield", role: "parent" }] },
    ],
    sessions: new Map(),
    handovers: new Map(),
    invites: [
      { id: "i1", token: "demo-invite", subdomain: "greenfield", fullName: "Chidi Okeke", email: "chidi@greenfield.ng", createdAt: 0 },
    ],
    links: new Map(),
    calendars: new Map([
      ["greenfield", { confirmed: true, startYear: 2026, terms: defaultTerms(2026) }],
      ["harbourview", { confirmed: true, startYear: 2026, terms: defaultTerms(2026) }],
      ["seaview", { confirmed: true, startYear: 2025, terms: defaultTerms(2025) }],
    ]),
    checklistHidden: new Set(),
    // Greenfield's two sample teachers (u12, u13): JSS 1 Blue and SS 1 Green, Mathematics and Physics.
    formTeachers: [
      { armId: "ga-gl1-gn1", userId: "u12" },
      { armId: "ga-gl4-gn3", userId: "u13" },
    ],
    subjectTeachers: [
      { armId: "ga-gl1-gn1", subjectId: "gs-mathematics", userId: "u12" },
      { armId: "ga-gl1-gn2", subjectId: "gs-mathematics", userId: "u12" },
      { armId: "ga-gl4-gn3", subjectId: "gs-physics", userId: "u13" },
      { armId: "ga-gl4-gn1", subjectId: "gs-physics", userId: "u13" },
      // Kemi Lawal (u15) teaches a subject across classes and isn't a form teacher.
      ...["gl1", "gl2", "gl3"].flatMap((level) => ["gn1", "gn2"].map((arm) => ({ armId: `ga-${level}-${arm}`, subjectId: "gs-english-studies", userId: "u15" }))),
    ],
    registers: [],
    marks: [],
    resultsSettings: new Map(),
    scores: [],
    completeSheets: [],
    exclusions: [],
    unlockRequests: [],
    resultsSeeded: false,
    // Greenfield rates behaviour, to show it; other schools start with ratings off.
    ratingSettings: new Map([["greenfield", { enabled: true, traits: ["Punctuality", "Neatness", "Attentiveness", "Politeness", "Teamwork"] }]]),
    remarks: [],
    ratings: [],
    publishedArms: [],
    closedTerms: [
      { subdomain: "seaview", key: "2025-1", name: "First Term", session: "2025/2026", by: "Ese Okoro", at: 0 },
      { subdomain: "seaview", key: "2025-2", name: "Second Term", session: "2025/2026", by: "Ese Okoro", at: 0 },
    ],
    promotion: new Map(),
    parentLinks: [
      { userId: "u14", guardianId: sampleGuardian.id },
      { userId: "u17", guardianId: jss2Guardian.id },
    ],
    registersSeeded: false,
    // The sample schools come with their colours chosen; the test schools are as fresh from signup.
    brandingSaved: new Set(["greenfield", "surebloom", "closedschool"]),
    profiles: new Map([
      ["greenfield", { levelsOffered: ["SECONDARY"], state: "Lagos", phone: "+2348030000001" }],
      ["surebloom", { levelsOffered: ["PRIMARY", "SECONDARY"], state: "Oyo", phone: "+2348030000002" }],
      ["royalheights", { levelsOffered: ["SECONDARY"], state: "Abuja", phone: "+2348030000003" }],
      ["kingsway", { levelsOffered: ["NURSERY", "PRIMARY"], state: "Rivers", phone: "+2348030000004" }],
      ["brookfield", { levelsOffered: ["SECONDARY"], state: "Enugu", phone: "+2348030000005" }],
      ["cedarwood", { levelsOffered: ["SECONDARY"], state: "Kano", phone: "+2348030000006" }],
      ["oakridge", { levelsOffered: ["PRIMARY"], state: "Ogun", phone: "+2348030000007" }],
      ["pinecrest", { levelsOffered: ["SECONDARY"], state: "Kaduna", phone: "+2348030000008" }],
      ["elmwood", { levelsOffered: ["SECONDARY"], state: "Cross River", phone: "+2348030000009" }],
      ["willowbank", { levelsOffered: ["SECONDARY"], state: "Kwara", phone: "+2348030000010" }],
      ["harbourview", { levelsOffered: ["SECONDARY"], state: "Lagos", phone: "+2348030000011" }],
      ["seaview", { levelsOffered: ["SECONDARY"], state: "Delta", phone: "+2348030000012" }],
    ]),
    levels: [...greenfield.levels, ...armsTests.flatMap((t) => t.levels)],
    armNames: [...greenfield.armNames, ...armsTests.flatMap((t) => t.armNames)],
    arms: [...greenfield.arms, ...armsTests.flatMap((t) => t.arms)],
    students: [...greenfieldStudents.students, ...armsTests.flatMap((t) => t.students)],
    guardians: greenfieldStudents.guardians,
    enrolments: greenfieldStudents.enrolments,
    importMappings: new Map(),
    importBatches: [],
    // Greenfield sends birthday messages, to show them; other schools start with them off.
    birthdaySettings: new Map([["greenfield", { enabled: true, message: DEFAULT_BIRTHDAY_MESSAGE }]]),
    birthdayLog: [],
    bookLists: seedBookLists(),
    corrections: [],
    admission: new Map([["greenfield", { pattern: "GC/{YEAR}/{NUMBER}", digits: 4, next: greenfieldStudents.next }]]),
    subjects: greenfieldSubjects.subjects,
    subjectLinks: greenfieldSubjects.subjectLinks,
    changes: [
      { id: "c1", subdomain: "greenfield", at: -60 * 24 * 9, who: "Amaka Obi", what: "Created the school" },
      { id: "c2", subdomain: "greenfield", at: -60 * 24 * 9 + 12, who: "Amaka Obi", what: "Set the 2026/2027 calendar" },
      { id: "c3", subdomain: "greenfield", at: -60 * 24 * 8, who: "Amaka Obi", what: "Invited Tunde Bello as an admin" },
      { id: "c4", subdomain: "greenfield", at: -60 * 24 * 7, who: "Tunde Bello", what: "Joined as an admin" },
      { id: "c5", subdomain: "greenfield", at: -60, who: "Amaka Obi", what: "Invited Chidi Okeke as an admin" },
      { id: "c6", subdomain: "surebloom", at: -60 * 24 * 2, who: "Ngozi Eze", what: "Created the school" },
    ],
  };
}

const holder = globalThis as unknown as { __brilliandaFakeStore?: FakeStore };

/**
 * One store for the server's life, kept across `pnpm dev` reloads so typed-in data survives. A
 * store made by older code lacks newer fields; those are filled in from a fresh seed, leaving
 * everything already there as it is.
 */
function keepStore(): FakeStore {
  const fresh = seed();
  const existing = holder.__brilliandaFakeStore;
  if (!existing) return (holder.__brilliandaFakeStore = fresh);
  for (const key of Object.keys(fresh) as (keyof FakeStore)[]) {
    if (!(key in existing)) (existing as Record<string, unknown>)[key] = fresh[key];
  }
  return existing;
}

export const store: FakeStore = keepStore();
