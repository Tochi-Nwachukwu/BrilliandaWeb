// FAKE: Home's checklist and counts, the school's calendar and its record of changes, on sample
// data. The backend replaces these with real queries; the record of changes becomes the plan's
// audit log.
import "server-only";
import { defaultTerms, type SessionInput } from "@brillianda/core/calendar";
import { sessionName } from "@brillianda/core/signup";
import type { ActionResult, HomeSummary, SessionSetup, SetupProgress } from "../types";
import { requireMember } from "./auth";
import { fixTimes, recordChange } from "./changes";
import { store } from "./store";


function calendarOf(subdomain: string) {
  const saved = store.calendars.get(subdomain);
  if (saved) return saved;
  // Not set up yet: suggest this school year, from today (plan: "The session defaults from today's date").
  const today = new Date();
  const startYear = today.getUTCMonth() >= 7 ? today.getUTCFullYear() : today.getUTCFullYear() - 1;
  return { confirmed: false, startYear, terms: defaultTerms(startYear) };
}

export async function getSession(subdomain: string): Promise<SessionSetup | null> {
  if (!(await requireMember(subdomain))) return null;
  const calendar = calendarOf(subdomain);
  return { ...calendar, name: sessionName(calendar.startYear) };
}

export async function saveSession(subdomain: string, input: SessionInput): Promise<ActionResult<SessionSetup>> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  const user = await requireMember(subdomain);
  if (!user) return { ok: false, error: "Sign in to change the calendar." };
  const before = store.calendars.get(subdomain);
  store.calendars.set(subdomain, { confirmed: true, startYear: input.startYear, terms: input.terms });
  recordChange(subdomain, user.fullName, before?.confirmed ? `Changed the ${sessionName(input.startYear)} calendar` : `Set the ${sessionName(input.startYear)} calendar`);
  return { ok: true, data: { confirmed: true, startYear: input.startYear, terms: input.terms, name: sessionName(input.startYear) } };
}

function teamSize(subdomain: string) {
  return store.users.filter((u) => u.schools.some((s) => s.subdomain === subdomain)).length;
}

export async function getSetupProgress(subdomain: string): Promise<SetupProgress | null> {
  if (!(await requireMember(subdomain))) return null;
  const invited = store.invites.some((i) => i.subdomain === subdomain);
  return {
    hidden: store.checklistHidden.has(subdomain),
    items: [
      { id: "branding", done: store.brandingSaved.has(subdomain) },
      { id: "calendar", done: calendarOf(subdomain).confirmed },
      { id: "classes", done: store.levels.some((l) => l.subdomain === subdomain) },
      { id: "arms", done: store.arms.some((a) => a.subdomain === subdomain) },
      { id: "subjects", done: store.subjectLinks.some((l) => l.subdomain === subdomain) },
      { id: "students", done: store.students.some((st) => st.subdomain === subdomain && !st.deletedAt) },
      { id: "admins", done: invited || teamSize(subdomain) > 1 },
    ],
  };
}

export async function hideChecklist(subdomain: string, hidden: boolean): Promise<ActionResult<null>> {
  if (!(await requireMember(subdomain))) return { ok: false, error: "Sign in first." };
  if (hidden) store.checklistHidden.add(subdomain);
  else store.checklistHidden.delete(subdomain);
  return { ok: true, data: null };
}

export async function getHomeSummary(subdomain: string): Promise<HomeSummary | null> {
  if (!(await requireMember(subdomain))) return null;
  fixTimes();
  const recent = store.changes
    .filter((c) => c.subdomain === subdomain)
    .sort((a, b) => b.at - a.at)
    .slice(0, 6)
    .map(({ id, at, who, what }) => ({ id, at, who, what }));
  const arms = store.arms.filter((a) => a.subdomain === subdomain && !a.archived);
  return {
    students: store.students.filter((st) => st.subdomain === subdomain && !st.deletedAt && st.status === "active").length,
    // A class is a level and an arm (plan: "JSS 1 to SS 3, three arms" makes 18 classes).
    classes: arms.length,
    arms: store.armNames.filter((a) => a.subdomain === subdomain).length,
    subjects: store.subjects.filter((x) => x.subdomain === subdomain).length,
    admins: teamSize(subdomain),
    recent,
  };
}
