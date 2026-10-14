// FAKE: promotion at the end of a session (group 3, batch 18; the first app's F-44). Suggested from
// each student's yearly average, changeable by hand; completing it closes the last term, moves
// everyone as decided, and starts the next session.
import "server-only";
import { defaultTerms } from "@brillianda/core/calendar";
import { defaultPassMark, nextArm, suggestDecision, yearlyAverage, type Decision } from "@brillianda/core/promotion";
import { sessionName } from "@brillianda/core/signup";
import { fullName } from "@brillianda/core/students";
import type { ActionResult, PromotionPlan } from "../types";
import { requireMember } from "./auth";
import { recordChange } from "./changes";
import { computeClass } from "./reports";
import { resultsTermOf, seedResults, settingsOf, subjectsForArm } from "./results";
import { store } from "./store";
import { armOptions } from "./students";

const pause = () => new Promise((resolve) => setTimeout(resolve, 300));
const fail = (error: string): ActionResult<never> => ({ ok: false, error });
const ADMINS_ONLY = "Only the school’s owner and admins can run promotion.";

const stateOf = (subdomain: string) => store.promotion.get(subdomain) ?? { overrides: [] };
const passMarkOf = (subdomain: string) => stateOf(subdomain).passMark ?? defaultPassMark(settingsOf(subdomain).scale);
const activeIn = (armId: string) =>
  store.students
    .filter((s) => s.armId === armId && !s.deletedAt && s.status === "active")
    .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName));

function sessionOf(subdomain: string) {
  const calendar = store.calendars.get(subdomain);
  const today = new Date();
  const startYear = calendar?.startYear ?? (today.getUTCMonth() >= 7 ? today.getUTCFullYear() : today.getUTCFullYear() - 1);
  return { startYear, terms: calendar?.terms ?? defaultTerms(startYear) };
}

/** Each student's average in every term of the session that has results (one class computation per term and arm). */
function termAverages(subdomain: string) {
  const { startYear, terms } = sessionOf(subdomain);
  const byStudent = new Map<string, (number | null)[]>();
  terms.forEach((_, i) => {
    const key = `${startYear}-${i + 1}`;
    const arms = new Set([...store.scores, ...store.exclusions].filter((x) => x.term === key).map((x) => x.armId));
    for (const armId of arms) {
      if (!store.arms.some((a) => a.id === armId && a.subdomain === subdomain)) continue;
      for (const [studentId, r] of computeClass(subdomain, key, armId).results) byStudent.set(studentId, [...(byStudent.get(studentId) ?? []), r.average]);
    }
  });
  return byStudent;
}

/** The classes with students, the final class level, and each student's suggestion and decision. */
function buildPlan(subdomain: string) {
  seedResults();
  const levels = store.levels.filter((l) => l.subdomain === subdomain && !l.archived);
  const lastPosition = Math.max(...levels.map((l) => l.position));
  const arms = store.arms.filter((a) => a.subdomain === subdomain && !a.archived);
  const options = armOptions(subdomain);
  const label = (armId: string) => options.find((a) => a.id === armId)?.label ?? "a class";
  const passMark = passMarkOf(subdomain);
  const overrides = stateOf(subdomain).overrides;
  const averages = termAverages(subdomain);
  const classes = options
    .filter((o) => activeIn(o.id).length > 0)
    .map((o) => {
      const arm = arms.find((a) => a.id === o.id)!;
      const finalClass = levels.find((l) => l.id === arm.levelId)?.position === lastPosition;
      const destination = finalClass ? null : nextArm(levels, arms, arm);
      return {
        armId: o.id,
        label: o.label,
        finalClass: finalClass || !destination,
        students: activeIn(o.id).map((s) => {
          const termList = averages.get(s.id) ?? [];
          const average = yearlyAverage(termList);
          const suggested = suggestDecision(average, passMark, finalClass || !destination);
          const changed = overrides.find((x) => x.studentId === s.id);
          const decision = changed?.decision ?? suggested;
          return {
            id: s.id,
            fullName: fullName(s),
            admissionNo: s.admissionNo,
            yearlyAverage: average,
            termsCounted: termList.filter((a) => a !== null).length,
            suggested,
            decision,
            reason: changed?.reason ?? null,
            destination: decision === "promote" && destination ? label(destination.id) : decision === "repeat" ? o.label : null,
            moveTo: decision === "promote" ? (destination?.id ?? null) : decision === "repeat" ? o.id : null,
          };
        }),
      };
    });
  return { passMark, classes };
}

function unpublishedFor(subdomain: string, key: string) {
  return armOptions(subdomain)
    .filter((a) => activeIn(a.id).length > 0 && subjectsForArm(subdomain, a.id).length > 0)
    .filter((a) => !store.publishedArms.some((p) => p.term === key && p.armId === a.id))
    .map((a) => ({ armId: a.id, label: a.label }));
}

export async function getPromotionPlan(subdomain: string): Promise<PromotionPlan | null> {
  if (!(await requireMember(subdomain))) return null;
  const { startYear, terms } = sessionOf(subdomain);
  const term = resultsTermOf(subdomain);
  const { passMark, classes } = buildPlan(subdomain);
  const counts = { promote: 0, repeat: 0, graduate: 0 } as Record<Decision, number>;
  for (const c of classes) for (const s of c.students) counts[s.decision]++;
  const next = defaultTerms(startYear + 1)[0]!;
  return {
    sessionName: sessionName(startYear),
    nextSessionName: sessionName(startYear + 1),
    passMark,
    open: !!term?.isLast,
    lastTerm: terms.at(-1)!.name,
    // The plan's own move-to arm ids stay on the server.
    classes: classes.map((c) => ({ ...c, students: c.students.map((s) => ({ id: s.id, fullName: s.fullName, admissionNo: s.admissionNo, yearlyAverage: s.yearlyAverage, termsCounted: s.termsCounted, suggested: s.suggested, decision: s.decision, reason: s.reason, destination: s.destination })) })),
    counts,
    unpublished: term?.isLast ? unpublishedFor(subdomain, term.key) : [],
    firstTerm: { name: next.name, startsOn: next.startsOn, endsOn: next.endsOn },
  };
}

export async function setPassMark(subdomain: string, passMark: number): Promise<ActionResult<null>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return fail(ADMINS_ONLY);
  store.promotion.set(subdomain, { ...stateOf(subdomain), passMark });
  recordChange(subdomain, who.fullName, `Set the promotion pass mark to ${passMark}`);
  return { ok: true, data: null };
}

/** Changes one student's decision. Choosing what the pass mark suggests clears the change. */
export async function setDecision(subdomain: string, studentId: string, decision: Decision, reason: string | null): Promise<ActionResult<null>> {
  const who = await requireMember(subdomain);
  if (!who) return fail(ADMINS_ONLY);
  const student = buildPlan(subdomain).classes.flatMap((c) => c.students).find((s) => s.id === studentId);
  if (!student) return fail("That student isn’t in a class this session.");
  const state = stateOf(subdomain);
  const overrides = state.overrides.filter((x) => x.studentId !== studentId);
  if (decision !== student.suggested) overrides.push({ studentId, decision, reason });
  store.promotion.set(subdomain, { ...state, overrides });
  return { ok: true, data: null };
}

/**
 * Ends the session: closes its last term, moves everyone as decided (graduates leave with status
 * graduated), and starts the next session with its first term's dates. Classes, subjects and
 * teachers carry over. Refused while classes are unpublished, unless `closeUnpublished`.
 */
export async function completePromotion(subdomain: string, input: { closeUnpublished: boolean; startsOn?: string; endsOn?: string }): Promise<ActionResult<{ promoted: number; repeating: number; graduated: number; session: string }>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return fail(ADMINS_ONLY);
  const term = resultsTermOf(subdomain);
  if (!term?.isLast) return fail("Promotion opens in the session’s last term.");
  const waiting = unpublishedFor(subdomain, term.key);
  if (waiting.length && !input.closeUnpublished) return fail(`${waiting.length} ${waiting.length === 1 ? "class isn’t" : "classes aren’t"} published yet: ${waiting.map((w) => w.label).join(", ")}. Publish them, or complete anyway.`);
  const { startYear } = sessionOf(subdomain);
  const nextTerms = defaultTerms(startYear + 1);
  if (input.startsOn && input.endsOn) {
    if (input.endsOn <= input.startsOn) return fail("The first term must end after it starts.");
    nextTerms[0] = { ...nextTerms[0]!, startsOn: input.startsOn, endsOn: input.endsOn };
  }

  const { classes } = buildPlan(subdomain);

  let promoted = 0;
  let repeating = 0;
  let graduated = 0;
  for (const c of classes) {
    for (const s of c.students) {
      const student = store.students.find((x) => x.id === s.id)!;
      if (s.decision === "graduate" || (s.decision === "promote" && !s.moveTo)) {
        student.status = "graduated";
        graduated++;
      } else if (s.decision === "promote") {
        student.armId = s.moveTo!;
        store.enrolments.push({ studentId: s.id, armId: s.moveTo!, from: nextTerms[0]!.startsOn });
        promoted++;
      } else {
        repeating++;
      }
      student.updatedAt = Date.now();
    }
  }
  store.closedTerms.push({ subdomain, key: term.key, name: term.name, session: term.session, by: who.fullName, at: Date.now() });
  for (const r of store.unlockRequests) if (r.term === term.key && r.status === "open") r.status = "declined";
  store.calendars.set(subdomain, { confirmed: true, startYear: startYear + 1, terms: nextTerms });
  store.promotion.set(subdomain, { passMark: stateOf(subdomain).passMark, overrides: [] });
  const session = sessionName(startYear + 1);
  recordChange(subdomain, who.fullName, `Completed promotion: ${promoted} moved up, ${repeating} repeating, ${graduated} graduated. ${session} begins ${nextTerms[0]!.startsOn}`);
  return { ok: true, data: { promoted, repeating, graduated, session } };
}
