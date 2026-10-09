// FAKE: sample data for every fake data function, kept in memory on the server until the backend
// replaces it (docs/data-contract.md). It resets when the dev server restarts. Kept on globalThis
// so a hot reload in development doesn't wipe it.
import "server-only";
import { defaultTerms, type Term } from "@brillianda/core/calendar";
import { armCodes, ARM_PRESETS, buildLadder, type Department, type Section } from "@brillianda/core/classes";
import { type SchoolDetails, type SchoolLevel } from "@brillianda/core/signup";
import { type StudentGender, type StudentStatus } from "@brillianda/core/students";
import { defaultLinks, preTicked, type LinkKind } from "@brillianda/core/subjects";
import type { SchoolSummary } from "../types";
import { CATALOGUE } from "./catalogue";

type FakeStore = {
  schools: SchoolSummary[];
  trialRequests: Record<string, unknown>[];
  signupDrafts: Map<string, FakeSignupDraft>;
  users: FakeUser[];
  sessions: Map<string, { userId: string }>;
  invites: FakeInvite[];
  links: Map<string, FakeLink>;
  calendars: Map<string, { confirmed: boolean; startYear: number; terms: Term[] }>;
  checklistHidden: Set<string>;
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

/** createdAt 0 means "sent just now"; filled in the first time it is read (see fake/auth.ts). */
export type FakeInvite = { id: string; token: string; subdomain: string; fullName: string; email: string; createdAt: number; usedAt?: number };
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
export type FakeUser = { id: string; fullName: string; email: string; password: string; phone?: string; schools: { subdomain: string; role: "owner" | "admin" }[] };

function seed(): FakeStore {
  const greenfield = seedGreenfieldClasses();
  const greenfieldSubjects = seedGreenfieldSubjects(greenfield.levels);
  const greenfieldStudents = seedGreenfieldStudents(greenfield.arms);
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
    ],
    trialRequests: [],
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
    ],
    sessions: new Map(),
    invites: [
      { id: "i1", token: "demo-invite", subdomain: "greenfield", fullName: "Chidi Okeke", email: "chidi@greenfield.ng", createdAt: 0 },
    ],
    links: new Map(),
    calendars: new Map([["greenfield", { confirmed: true, startYear: 2026, terms: defaultTerms(2026) }]]),
    checklistHidden: new Set(),
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
    ]),
    levels: greenfield.levels,
    armNames: greenfield.armNames,
    arms: greenfield.arms,
    students: greenfieldStudents.students,
    guardians: greenfieldStudents.guardians,
    enrolments: greenfieldStudents.enrolments,
    importMappings: new Map(),
    importBatches: [],
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
export const store: FakeStore = (holder.__brilliandaFakeStore ??= seed());
