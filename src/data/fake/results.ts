// FAKE: results (batch 14) on sample data: settings, score sheets, marking complete and unlocking.
// The backend replaces this with assessment, score and sheet-status tables; the maths stays in
// packages/core (grading.ts, results.ts) so both sides agree (F-32).
import "server-only";
import { defaultTerms } from "@brillianda/core/calendar";
import { parseScoreInput } from "@brillianda/core/grading";
import { DEFAULT_COMPONENTS, DEFAULT_SCALE, sheetProgress, type ResultsSettings } from "@brillianda/core/results";
import { fullName } from "@brillianda/core/students";
import { sessionName } from "@brillianda/core/signup";
import { todayInLagos } from "@/lib/time";
import type { ActionResult, ResultsOverview, ResultsSettingsData, ResultsTerm, ScoreSheetData, SheetStatus, SheetSummary, UnlockRequest } from "../types";
import { requireMember, requireStaff } from "./auth";
import { recordChange } from "./changes";
import { store } from "./store";
import { armOptions } from "./students";

const pause = () => new Promise((resolve) => setTimeout(resolve, 200));
const fail = (error: string, fieldErrors?: Record<string, string[]>): ActionResult<never> => ({ ok: false, error, fieldErrors });

export function settingsOf(subdomain: string) {
  return store.resultsSettings.get(subdomain) ?? { components: DEFAULT_COMPONENTS, scale: DEFAULT_SCALE, showPositions: true };
}

function calendarFor(subdomain: string) {
  const calendar = store.calendars.get(subdomain);
  const today = new Date();
  const startYear = calendar?.startYear ?? (today.getUTCMonth() >= 7 ? today.getUTCFullYear() : today.getUTCFullYear() - 1);
  return { startYear, terms: calendar?.terms ?? defaultTerms(startYear) };
}

/**
 * The term results are for (batch 17): the session's first term that isn't closed, once it has
 * started. A term stays open until an admin closes it, so scores never lock because a date passed.
 */
export function resultsTermOf(subdomain: string): ResultsTerm | null {
  const { startYear, terms } = calendarFor(subdomain);
  const closed = new Set(store.closedTerms.filter((c) => c.subdomain === subdomain).map((c) => c.key));
  const index = terms.findIndex((_, i) => !closed.has(`${startYear}-${i + 1}`));
  if (index < 0 || terms[index]!.startsOn > todayInLagos()) return null;
  return { key: `${startYear}-${index + 1}`, name: terms[index]!.name, session: sessionName(startYear), index, isLast: index === terms.length - 1 };
}

/** The next term, when no term is open: it opens on its start date. */
export function nextTermOf(subdomain: string): { name: string; startsOn: string } | null {
  const { startYear, terms } = calendarFor(subdomain);
  const closed = new Set(store.closedTerms.filter((c) => c.subdomain === subdomain).map((c) => c.key));
  const next = terms.find((_, i) => !closed.has(`${startYear}-${i + 1}`));
  return next ? { name: next.name, startsOn: next.startsOn } : null;
}

const armLabelOf = (subdomain: string, armId: string) => armOptions(subdomain).find((a) => a.id === armId)?.label ?? "a class";
const studentsIn = (armId: string) =>
  store.students
    .filter((s) => s.armId === armId && !s.deletedAt && s.status === "active")
    .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));

/** The subjects an arm has sheets for: its level's subjects, matching its department in senior classes. */
export function subjectsForArm(subdomain: string, armId: string) {
  const arm = store.arms.find((a) => a.subdomain === subdomain && a.id === armId);
  if (!arm) return [];
  return store.subjectLinks
    .filter((l) => l.subdomain === subdomain && l.levelId === arm.levelId && (!l.department || !arm.department || l.department === arm.department))
    .map((l) => ({ subject: store.subjects.find((s) => s.id === l.subjectId)!, kind: l.kind }))
    .filter((x) => x.subject)
    .sort((a, b) => a.subject.position - b.subject.position);
}

/**
 * Who belongs on a sheet: the arm's students now for the open term; for a closed term, the
 * students who had scores (or were left out of an elective) in that arm then, since classes move on.
 */
export function pupilsFor(term: string, armId: string) {
  const subdomain = store.arms.find((a) => a.id === armId)?.subdomain;
  if (subdomain && resultsTermOf(subdomain)?.key === term) return studentsIn(armId);
  const ids = new Set([...store.scores, ...store.exclusions].filter((x) => x.term === term && x.armId === armId).map((x) => x.studentId));
  return store.students.filter((s) => ids.has(s.id)).sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));
}

export function rowsOf(term: string, armId: string, subjectId: string) {
  return pupilsFor(term, armId).map((s) => {
    const scores: Record<string, { value: number; isAbsent: boolean }> = {};
    for (const sc of store.scores) if (sc.term === term && sc.armId === armId && sc.subjectId === subjectId && sc.studentId === s.id) scores[sc.componentId] = { value: sc.value, isAbsent: sc.isAbsent };
    return {
      studentId: s.id,
      fullName: fullName(s),
      admissionNo: s.admissionNo,
      excluded: store.exclusions.some((e) => e.term === term && e.armId === armId && e.subjectId === subjectId && e.studentId === s.id),
      scores,
    };
  });
}

export function statusOf(subdomain: string, term: string, armId: string, subjectId: string): { status: SheetStatus; complete: number; of: number } {
  const progress = sheetProgress(rowsOf(term, armId, subjectId), settingsOf(subdomain).components);
  if (store.completeSheets.some((c) => c.term === term && c.armId === armId && c.subjectId === subjectId)) return { status: "complete", ...progress };
  const any = store.scores.some((s) => s.term === term && s.armId === armId && s.subjectId === subjectId);
  return { status: any ? "in-progress" : "not-started", ...progress };
}

const openRequest = (term: string, armId: string, subjectId: string): UnlockRequest | null => {
  const r = store.unlockRequests.find((u) => u.term === term && u.armId === armId && u.subjectId === subjectId && u.status === "open");
  return r ? { id: r.id, by: r.by, reason: r.reason, at: r.at } : null;
};

/**
 * Sample results for Greenfield: JSS 1 Blue mostly complete (Mathematics part-way, English Studies
 * not started), and JSS 2 Blue with every subject complete, ready to publish.
 */
export function seedResults() {
  if (store.resultsSeeded) return;
  store.resultsSeeded = true;
  const term = resultsTermOf("greenfield");
  if (!term) return;
  const fill = (armId: string, skip: (subjectId: string) => "none" | "half" | "all") => {
    const pupils = studentsIn(armId);
    subjectsForArm("greenfield", armId).forEach(({ subject }, si) => {
      const how = skip(subject.id);
      if (how === "none") return;
      pupils.forEach((p, pi) => {
        if (how === "half" && pi >= Math.ceil(pupils.length / 2)) return;
        const base = 38 + ((si * 7 + pi * 11) % 50);
        const parts = { ca1: Math.round((base / 100) * 20), ca2: Math.round(((base + 6) / 100) * 20), exam: Math.round((Math.min(base + 3, 100) / 100) * 60) };
        for (const [componentId, value] of Object.entries(parts)) store.scores.push({ term: term.key, armId, subjectId: subject.id, studentId: p.id, componentId, value: Math.min(value, componentId === "exam" ? 60 : 20), isAbsent: false });
      });
      if (how === "all") store.completeSheets.push({ term: term.key, armId, subjectId: subject.id, by: "Sample teacher", at: Date.now() - 86_400_000 });
    });
  };
  fill("ga-gl1-gn1", (id) => (id === "gs-english-studies" ? "none" : id === "gs-mathematics" ? "half" : "all"));
  fill("ga-gl2-gn1", () => "all");
}

/** Who may work on a sheet: admins always; the subject's teacher for that arm. */
async function sheetAccess(subdomain: string, armId: string, subjectId: string) {
  const staff = await requireStaff(subdomain);
  if (!staff) return null;
  const isAdmin = staff.role === "owner" || staff.role === "admin";
  if (!isAdmin && !store.subjectTeachers.some((t) => t.armId === armId && t.subjectId === subjectId && t.userId === staff.user.id)) return null;
  if (!subjectsForArm(subdomain, armId).some((x) => x.subject.id === subjectId)) return null;
  return { ...staff, isAdmin };
}

// ——— Settings ———

export async function getResultsSettings(subdomain: string): Promise<ResultsSettingsData | null> {
  if (!(await requireMember(subdomain))) return null;
  seedResults();
  const term = resultsTermOf(subdomain);
  return { ...settingsOf(subdomain), scoresEntered: !!term && store.scores.some((s) => s.term === term.key && store.arms.some((a) => a.id === s.armId && a.subdomain === subdomain)) };
}

export async function saveResultsSettings(subdomain: string, input: ResultsSettings): Promise<ActionResult<null>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return fail("Only the school’s owner and admins can change results settings.");
  const current = settingsOf(subdomain);
  const term = resultsTermOf(subdomain);
  const scoresIn = !!term && store.scores.some((s) => s.term === term.key && store.arms.some((a) => a.id === s.armId && a.subdomain === subdomain));
  const partsChanged = current.components.length !== input.components.length || current.components.some((c, i) => c.id !== input.components[i]?.id || c.maxScore !== input.components[i]?.maxScore);
  if (scoresIn && partsChanged) return fail("Scores are already in for this term, so the parts and their marks can’t change until next term. Names and grades can.");
  store.resultsSettings.set(subdomain, { components: input.components, scale: [...input.scale].sort((a, b) => b.minScore - a.minScore), showPositions: input.showPositions });
  recordChange(subdomain, who.fullName, "Changed the results settings");
  return { ok: true, data: null };
}

// ——— Sheets ———

export async function getScoreSheet(subdomain: string, armId: string, subjectId: string): Promise<ScoreSheetData | null> {
  const access = await sheetAccess(subdomain, armId, subjectId);
  const term = resultsTermOf(subdomain);
  if (!access || !term) return null;
  seedResults();
  const { status } = statusOf(subdomain, term.key, armId, subjectId);
  const link = subjectsForArm(subdomain, armId).find((x) => x.subject.id === subjectId)!;
  const settings = settingsOf(subdomain);
  const done = store.completeSheets.find((c) => c.term === term.key && c.armId === armId && c.subjectId === subjectId);
  return {
    term,
    armId,
    armLabel: armLabelOf(subdomain, armId),
    subjectId,
    subjectName: link.subject.name,
    kind: link.kind,
    components: settings.components,
    scale: settings.scale,
    status,
    canEdit: access.isAdmin || status !== "complete",
    isAdmin: access.isAdmin,
    completedBy: done ? { by: done.by, at: done.at } : null,
    unlockRequest: openRequest(term.key, armId, subjectId),
    rows: rowsOf(term.key, armId, subjectId),
  };
}

/** One cell: what was typed ("", "ABS" or a number), checked the same way the grid checks it. */
export async function saveScore(subdomain: string, armId: string, subjectId: string, studentId: string, componentId: string, raw: string): Promise<ActionResult<{ status: SheetStatus }>> {
  const access = await sheetAccess(subdomain, armId, subjectId);
  const term = resultsTermOf(subdomain);
  if (!access || !term) return fail("You can’t enter scores for this class.");
  const { status } = statusOf(subdomain, term.key, armId, subjectId);
  if (status === "complete" && !access.isAdmin) return fail("This sheet is marked complete. Ask an admin to unlock it.");
  const component = settingsOf(subdomain).components.find((c) => c.id === componentId);
  if (!component || !studentsIn(armId).some((s) => s.id === studentId)) return fail("That student or part isn’t on this sheet any more. Reload the page.");
  const parsed = parseScoreInput(raw, component.maxScore);
  if (!parsed.ok) return fail(parsed.error);
  store.scores = store.scores.filter((s) => !(s.term === term.key && s.armId === armId && s.subjectId === subjectId && s.studentId === studentId && s.componentId === componentId));
  if (parsed.cell) store.scores.push({ term: term.key, armId, subjectId, studentId, componentId, ...parsed.cell });
  return { ok: true, data: { status: statusOf(subdomain, term.key, armId, subjectId).status } };
}

/** An elective a student doesn't take: their scores for it are cleared and it leaves their average. */
export async function setExcluded(subdomain: string, armId: string, subjectId: string, studentId: string, excluded: boolean): Promise<ActionResult<null>> {
  await pause();
  const access = await sheetAccess(subdomain, armId, subjectId);
  const term = resultsTermOf(subdomain);
  if (!access || !term) return fail("You can’t change this sheet.");
  if (statusOf(subdomain, term.key, armId, subjectId).status === "complete" && !access.isAdmin) return fail("This sheet is marked complete. Ask an admin to unlock it.");
  const link = subjectsForArm(subdomain, armId).find((x) => x.subject.id === subjectId);
  if (link?.kind !== "elective") return fail("Every student takes a compulsory subject.");
  store.exclusions = store.exclusions.filter((e) => !(e.term === term.key && e.armId === armId && e.subjectId === subjectId && e.studentId === studentId));
  if (excluded) {
    store.exclusions.push({ term: term.key, armId, subjectId, studentId });
    store.scores = store.scores.filter((s) => !(s.term === term.key && s.armId === armId && s.subjectId === subjectId && s.studentId === studentId));
  }
  return { ok: true, data: null };
}

export async function markComplete(subdomain: string, armId: string, subjectId: string): Promise<ActionResult<null>> {
  await pause();
  const access = await sheetAccess(subdomain, armId, subjectId);
  const term = resultsTermOf(subdomain);
  if (!access || !term) return fail("You can’t change this sheet.");
  const s = statusOf(subdomain, term.key, armId, subjectId);
  if (s.status === "complete") return fail("It’s already marked complete.");
  if (s.complete < s.of) return fail(`${s.of - s.complete} ${s.of - s.complete === 1 ? "student still has" : "students still have"} empty scores. Enter them, or ABS for absent.`);
  store.completeSheets.push({ term: term.key, armId, subjectId, by: access.user.fullName, at: Date.now() });
  recordChange(subdomain, access.user.fullName, `Marked ${store.subjects.find((x) => x.id === subjectId)?.name ?? "a subject"} complete for ${armLabelOf(subdomain, armId)}`);
  return { ok: true, data: null };
}

export async function requestUnlock(subdomain: string, armId: string, subjectId: string, reason: string): Promise<ActionResult<null>> {
  await pause();
  const access = await sheetAccess(subdomain, armId, subjectId);
  const term = resultsTermOf(subdomain);
  if (!access || !term) return fail("You can’t change this sheet.");
  if (statusOf(subdomain, term.key, armId, subjectId).status !== "complete") return fail("It isn’t locked.");
  if (openRequest(term.key, armId, subjectId)) return fail("A request is already waiting for an admin.");
  store.unlockRequests.push({ id: crypto.randomUUID(), term: term.key, armId, subjectId, by: access.user.fullName, reason, at: Date.now(), status: "open" });
  recordChange(subdomain, access.user.fullName, `Asked to unlock ${store.subjects.find((x) => x.id === subjectId)?.name ?? "a subject"} for ${armLabelOf(subdomain, armId)}: ${reason}`);
  return { ok: true, data: null };
}

/** Admins reopen a sheet (answering a teacher's request, if there is one), or decline the request. */
export async function resolveUnlock(subdomain: string, armId: string, subjectId: string, approve: boolean): Promise<ActionResult<null>> {
  await pause();
  const who = await requireMember(subdomain);
  const term = resultsTermOf(subdomain);
  if (!who || !term) return fail("Only the school’s owner and admins can unlock sheets.");
  const request = store.unlockRequests.find((u) => u.term === term.key && u.armId === armId && u.subjectId === subjectId && u.status === "open");
  if (request) request.status = approve ? "approved" : "declined";
  const subject = store.subjects.find((x) => x.id === subjectId)?.name ?? "a subject";
  if (approve) {
    store.completeSheets = store.completeSheets.filter((c) => !(c.term === term.key && c.armId === armId && c.subjectId === subjectId));
    recordChange(subdomain, who.fullName, `Unlocked ${subject} for ${armLabelOf(subdomain, armId)}`);
  } else if (request) {
    recordChange(subdomain, who.fullName, `Declined ${request.by}’s request to unlock ${subject} for ${armLabelOf(subdomain, armId)}`);
  } else return fail("There’s no request to decline.");
  return { ok: true, data: null };
}

// ——— Lists ———

function summaries(subdomain: string, term: string, armId: string): SheetSummary[] {
  return subjectsForArm(subdomain, armId).map(({ subject, kind }) => {
    const teacherId = store.subjectTeachers.find((t) => t.armId === armId && t.subjectId === subject.id)?.userId;
    return {
      armId,
      armLabel: armLabelOf(subdomain, armId),
      subjectId: subject.id,
      subjectName: subject.name,
      kind,
      teacher: store.users.find((u) => u.id === teacherId)?.fullName ?? null,
      ...statusOf(subdomain, term, armId, subject.id),
      unlockRequest: openRequest(term, armId, subject.id),
    };
  });
}

export async function getResultsOverview(subdomain: string): Promise<ResultsOverview | null> {
  if (!(await requireMember(subdomain))) return null;
  seedResults();
  const term = resultsTermOf(subdomain);
  if (!term) return { term: null, next: nextTermOf(subdomain), arms: [], requests: [] };
  const arms = armOptions(subdomain).filter((a) => studentsIn(a.id).length > 0);
  return {
    term,
    next: null,
    arms: arms.map((a) => {
      const sheets = summaries(subdomain, term.key, a.id);
      return { armId: a.id, label: a.label, sheets: sheets.length, complete: sheets.filter((s) => s.status === "complete").length, inProgress: sheets.filter((s) => s.status === "in-progress").length };
    }),
    requests: store.unlockRequests
      .filter((u) => u.term === term.key && u.status === "open" && arms.some((a) => a.id === u.armId))
      .map((u) => ({ id: u.id, by: u.by, reason: u.reason, at: u.at, armId: u.armId, armLabel: armLabelOf(subdomain, u.armId), subjectId: u.subjectId, subjectName: store.subjects.find((x) => x.id === u.subjectId)?.name ?? "A subject" })),
  };
}

/** One arm's sheets, for admins. */
export async function getArmSheets(subdomain: string, armId: string): Promise<{ term: ResultsTerm; armLabel: string; sheets: SheetSummary[] } | null> {
  if (!(await requireMember(subdomain))) return null;
  seedResults();
  const term = resultsTermOf(subdomain);
  if (!term || !store.arms.some((a) => a.subdomain === subdomain && a.id === armId)) return null;
  return { term, armLabel: armLabelOf(subdomain, armId), sheets: summaries(subdomain, term.key, armId) };
}

/** A teacher's own sheets this term, with progress. */
export async function getMySheets(subdomain: string): Promise<{ term: ResultsTerm | null; sheets: SheetSummary[] } | null> {
  const staff = await requireStaff(subdomain);
  if (!staff) return null;
  seedResults();
  const term = resultsTermOf(subdomain);
  if (!term) return { term: null, sheets: [] };
  const mine = store.subjectTeachers.filter((t) => t.userId === staff.user.id && store.arms.some((a) => a.id === t.armId && a.subdomain === subdomain));
  const sheets = mine.flatMap((t) => summaries(subdomain, term.key, t.armId).filter((s) => s.subjectId === t.subjectId));
  return { term, sheets };
}
