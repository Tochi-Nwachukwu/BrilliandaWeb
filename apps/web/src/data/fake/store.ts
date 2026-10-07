// FAKE: sample data for every fake data function, kept in memory on the server until the backend
// replaces it (docs/data-contract.md). It resets when the dev server restarts. Kept on globalThis
// so a hot reload in development doesn't wipe it.
import "server-only";
import { defaultTerms, type SchoolDetails, type Term } from "@brillianda/core";
import type { SchoolSummary } from "../types";

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
};

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
  return {
    schools: [
      { subdomain: "greenfield", name: "Greenfield College", status: "active", brandColor: "#4A3AA7", logoUrl: null },
      { subdomain: "surebloom", name: "Surebloom School", status: "active", brandColor: "#1E6B45", logoUrl: null },
      { subdomain: "closedschool", name: "Closed School", status: "suspended", brandColor: "#4A3AA7", logoUrl: null },
      { subdomain: "royalheights", name: "Royal Heights College", status: "active", brandColor: "#9A3B2E", logoUrl: null },
      { subdomain: "kingsway", name: "Kingsway Academy", status: "active", brandColor: "#0E6E8C", logoUrl: null },
    ],
    trialRequests: [],
    signupDrafts: new Map(),
    users: [
      { id: "u1", fullName: "Amaka Obi", email: "owner@greenfield.ng", password: "brillianda", schools: [{ subdomain: "greenfield", role: "owner" }] },
      { id: "u2", fullName: "Tunde Bello", email: "admin@greenfield.ng", password: "brillianda", schools: [{ subdomain: "greenfield", role: "admin" }, { subdomain: "surebloom", role: "admin" }] },
      { id: "u3", fullName: "Ngozi Eze", email: "owner@surebloom.ng", password: "brillianda", schools: [{ subdomain: "surebloom", role: "owner" }] },
      { id: "u4", fullName: "Bayo Adeyemi", email: "owner@royalheights.ng", password: "brillianda", schools: [{ subdomain: "royalheights", role: "owner" }] },
      { id: "u5", fullName: "Funke Ade", email: "owner@kingsway.ng", password: "brillianda", schools: [{ subdomain: "kingsway", role: "owner" }] },
    ],
    sessions: new Map(),
    invites: [
      { id: "i1", token: "demo-invite", subdomain: "greenfield", fullName: "Chidi Okeke", email: "chidi@greenfield.ng", createdAt: 0 },
    ],
    links: new Map(),
    calendars: new Map([["greenfield", { confirmed: true, startYear: 2026, terms: defaultTerms(2026) }]]),
    checklistHidden: new Set(),
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
