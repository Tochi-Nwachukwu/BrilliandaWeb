// FAKE: sample data for every fake data function, kept in memory on the server until the backend
// replaces it (docs/data-contract.md). It resets when the dev server restarts. Kept on globalThis
// so a hot reload in development doesn't wipe it.
import "server-only";
import { armCodes, ARM_PRESETS, buildLadder, defaultLinks, defaultTerms, preTicked, type LinkKind, type Department, type SchoolDetails, type SchoolLevel, type Section, type Term } from "@brillianda/core";
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
  /** at <= 0 means "that many minutes before the first read" (see fake/home.ts). */
  changes: { id: string; subdomain: string; at: number; who: string; what: string }[];
  /** What signup collected about each school that its pages don't show. */
  profiles: Map<string, { levelsOffered: SchoolLevel[]; state: string; phone: string }>;
  levels: { id: string; subdomain: string; key: string | null; name: string; short: string; section: Section; position: number; archived: boolean }[];
  armNames: { id: string; subdomain: string; name: string; code: string; position: number }[];
  arms: { id: string; subdomain: string; levelId: string; armNameId: string; department: Department | null; archived: boolean }[];
  /** Filled in by batch 8 (students). Only what classes need for now. */
  students: { id: string; subdomain: string; armId: string; status: string }[];
  subjects: { id: string; subdomain: string; catalogueId: string | null; name: string; code: string; position: number }[];
  subjectLinks: { subdomain: string; subjectId: string; levelId: string; kind: LinkKind; department: Department | null }[];
};

/** Greenfield's subjects: the 2025 junior and senior lists, attached by default. */
function seedGreenfieldSubjects(levels: { id: string; key: string | null; section: Section }[]) {
  const entries = CATALOGUE.filter((e) => preTicked(CATALOGUE, ["junior", "senior"]).includes(e.id));
  const subjects = entries.map((e, i) => ({ id: `gs-${e.id}`, subdomain: "greenfield", catalogueId: e.id, name: e.name, code: e.code, position: i }));
  const subjectLinks = defaultLinks(entries, levels).map((l) => ({ subdomain: "greenfield", subjectId: `gs-${l.entryId}`, levelId: l.levelId, kind: l.kind, department: l.department }));
  return { subjects, subjectLinks };
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
    ],
    sessions: new Map(),
    invites: [
      { id: "i1", token: "demo-invite", subdomain: "greenfield", fullName: "Chidi Okeke", email: "chidi@greenfield.ng", createdAt: 0 },
    ],
    links: new Map(),
    calendars: new Map([["greenfield", { confirmed: true, startYear: 2026, terms: defaultTerms(2026) }]]),
    checklistHidden: new Set(),
    profiles: new Map([
      ["greenfield", { levelsOffered: ["SECONDARY"], state: "Lagos", phone: "+2348030000001" }],
      ["surebloom", { levelsOffered: ["PRIMARY", "SECONDARY"], state: "Oyo", phone: "+2348030000002" }],
      ["royalheights", { levelsOffered: ["SECONDARY"], state: "Abuja", phone: "+2348030000003" }],
      ["kingsway", { levelsOffered: ["NURSERY", "PRIMARY"], state: "Rivers", phone: "+2348030000004" }],
      ["brookfield", { levelsOffered: ["SECONDARY"], state: "Enugu", phone: "+2348030000005" }],
      ["cedarwood", { levelsOffered: ["SECONDARY"], state: "Kano", phone: "+2348030000006" }],
    ]),
    levels: greenfield.levels,
    armNames: greenfield.armNames,
    arms: greenfield.arms,
    students: [],
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
