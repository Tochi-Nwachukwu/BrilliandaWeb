// FAKE: running the school year (group 3). Batch 17: closing a term. Closing locks the term's
// scores (they stay on students' records, and with parents where published) and opens the next
// term's sheets for the same classes, subjects and teachers (first app, F-43).
import "server-only";
import type { ActionResult, TermStatusData } from "../types";
import { requireMember } from "./auth";
import { recordChange } from "./changes";
import { nextTermOf, resultsTermOf, seedResults, subjectsForArm } from "./results";
import { store } from "./store";
import { armOptions } from "./students";

const pause = () => new Promise((resolve) => setTimeout(resolve, 300));
const fail = (error: string): ActionResult<never> => ({ ok: false, error });
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** Classes with students and subjects that aren't published for a term. */
function unpublished(subdomain: string, key: string) {
  return armOptions(subdomain)
    .filter((a) => store.students.some((s) => s.armId === a.id && !s.deletedAt && s.status === "active") && subjectsForArm(subdomain, a.id).length > 0)
    .filter((a) => !store.publishedArms.some((p) => p.term === key && p.armId === a.id))
    .map((a) => ({ armId: a.id, label: a.label }));
}

export async function getTermStatus(subdomain: string): Promise<TermStatusData | null> {
  if (!(await requireMember(subdomain))) return null;
  seedResults();
  const open = resultsTermOf(subdomain);
  const calendar = store.calendars.get(subdomain);
  const following = open && calendar ? (calendar.terms[open.index + 1] ?? null) : null;
  return {
    open,
    following: following ? { name: following.name, startsOn: following.startsOn, endsOn: following.endsOn } : null,
    waiting: open ? null : nextTermOf(subdomain),
    unpublished: open ? unpublished(subdomain, open.key) : [],
    closed: store.closedTerms
      .filter((c) => c.subdomain === subdomain)
      .map((c) => ({ key: c.key, name: c.name, session: c.session, by: c.by, at: c.at }))
      .sort((a, b) => b.key.localeCompare(a.key)),
  };
}

/**
 * Closes the open term. Not the session's last term: that one closes when promotion is completed
 * (batch 18). While classes are unpublished it's refused unless `closeUnpublished`; those classes'
 * parents never see the term. The next term's dates can be adjusted on the way.
 */
export async function closeTerm(subdomain: string, input: { closeUnpublished: boolean; nextStartsOn?: string; nextEndsOn?: string }): Promise<ActionResult<{ closed: string; next: string | null }>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return fail("Only the school’s owner and admins can close a term.");
  seedResults();
  const term = resultsTermOf(subdomain);
  if (!term) return fail("No term is open for results.");
  if (term.isLast) return fail(`${term.name} is the last term of the session. It closes when you complete promotion.`);
  const waiting = unpublished(subdomain, term.key);
  if (waiting.length && !input.closeUnpublished) return fail(`${waiting.length} ${waiting.length === 1 ? "class isn’t" : "classes aren’t"} published yet: ${waiting.map((w) => w.label).join(", ")}. Publish them, or close anyway.`);

  const calendar = store.calendars.get(subdomain);
  const next = calendar?.terms[term.index + 1];
  if (calendar && next && (input.nextStartsOn || input.nextEndsOn)) {
    const startsOn = input.nextStartsOn ?? next.startsOn;
    const endsOn = input.nextEndsOn ?? next.endsOn;
    if (!DAY.test(startsOn) || !DAY.test(endsOn)) return fail("Pick the next term’s dates.");
    if (endsOn <= startsOn) return fail("The next term must end after it starts.");
    if (startsOn <= calendar.terms[term.index]!.startsOn) return fail(`The next term must start after ${term.name} did.`);
    calendar.terms[term.index + 1] = { ...next, startsOn, endsOn };
  }

  store.closedTerms.push({ subdomain, key: term.key, name: term.name, session: term.session, by: who.fullName, at: Date.now() });
  // Requests to unlock a sheet end with its term.
  for (const r of store.unlockRequests) if (r.term === term.key && r.status === "open") r.status = "declined";
  recordChange(subdomain, who.fullName, `Closed ${term.name} ${term.session}${waiting.length ? ` (${waiting.length} unpublished)` : ""}`);
  return { ok: true, data: { closed: term.name, next: next?.name ?? null } };
}
