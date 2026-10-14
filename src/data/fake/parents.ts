// FAKE: parents (batch 12) on sample data. A parent's account belongs to a guardian record, so they
// see that guardian's children and nobody else's. The backend replaces this with a parent-guardian
// link table and invitations with role "parent".
import "server-only";
import { schoolDaysSoFar, termOf } from "@brillianda/core/attendance";
import { defaultTerms } from "@brillianda/core/calendar";
import { fullName } from "@brillianda/core/students";
import { todayInLagos } from "@/lib/time";
import type { ActionResult, ParentAccess, ParentHome, ParentsPage, ReportCardData, SampleEmail } from "../types";
import { requireMember, requireParent } from "./auth";
import { recordChange } from "./changes";
import { store } from "./store";
import { armOptions } from "./students";
import { buildReportCard } from "./reports";
import { resultsTermOf } from "./results";
import { attendanceOf } from "./teaching";

const pause = () => new Promise((resolve) => setTimeout(resolve, 300));
const fail = (error: string): ActionResult<never> => ({ ok: false, error });
const ADMINS_ONLY = "Only the school’s owner and admins can do this.";

function termsOf(subdomain: string) {
  const saved = store.calendars.get(subdomain);
  if (saved) return saved.terms;
  const today = new Date();
  return defaultTerms(today.getUTCMonth() >= 7 ? today.getUTCFullYear() : today.getUTCFullYear() - 1);
}
const childrenOf = (subdomain: string, guardianId: string) =>
  store.students.filter((s) => s.subdomain === subdomain && s.guardianId === guardianId && !s.deletedAt);
const armLabelOf = (subdomain: string, armId: string) => armOptions(subdomain).find((a) => a.id === armId)?.label ?? "No class";

/** Does this guardian use the parent app? (For the Parents page and a student's profile.) */
export function parentAccessOf(subdomain: string, guardianId: string): ParentAccess {
  const linked = store.parentLinks.some(
    (l) => l.guardianId === guardianId && store.users.some((u) => u.id === l.userId && u.schools.some((s) => s.subdomain === subdomain && s.role === "parent")),
  );
  if (linked) return "active";
  return store.invites.some((i) => i.subdomain === subdomain && i.role === "parent" && i.guardianId === guardianId && !i.usedAt) ? "invited" : "none";
}

// ——— More › Parents (owners and admins) ———

export async function getParentsPage(subdomain: string): Promise<ParentsPage | null> {
  if (!(await requireMember(subdomain))) return null;
  const guardians = store.guardians
    .filter((g) => g.subdomain === subdomain)
    .map((g) => ({
      id: g.id,
      name: g.name,
      email: g.email,
      phone: g.phone,
      children: childrenOf(subdomain, g.id).map((s) => ({ id: s.id, fullName: fullName(s), armLabel: armLabelOf(subdomain, s.armId) })),
      access: parentAccessOf(subdomain, g.id),
    }))
    .filter((g) => g.children.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
  return { guardians };
}

function makeInvite(subdomain: string, guardianId: string) {
  const g = store.guardians.find((x) => x.subdomain === subdomain && x.id === guardianId)!;
  const token = crypto.randomUUID();
  const pending = store.invites.find((i) => i.subdomain === subdomain && i.role === "parent" && i.guardianId === guardianId && !i.usedAt);
  if (pending) Object.assign(pending, { token, createdAt: Date.now(), email: g.email!, fullName: g.name });
  else store.invites.push({ id: crypto.randomUUID(), token, subdomain, fullName: g.name, email: g.email!, createdAt: Date.now(), role: "parent", guardianId });
  return { label: `Open ${g.name}’s invite`, href: `/s/${subdomain}/invite?token=${token}` };
}

/** Invites one guardian to the parent app, by the email on their record. */
export async function inviteParent(subdomain: string, guardianId: string): Promise<ActionResult<SampleEmail>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return fail(ADMINS_ONLY);
  const g = store.guardians.find((x) => x.subdomain === subdomain && x.id === guardianId);
  if (!g) return fail("That guardian isn’t here any more.");
  if (!g.email) return fail(`${g.name} has no email on file. Add one from their child’s page first.`);
  if (parentAccessOf(subdomain, guardianId) === "active") return fail(`${g.name} already uses the parent app.`);
  const link = makeInvite(subdomain, guardianId);
  recordChange(subdomain, who.fullName, `Invited ${g.name} to the parent app`);
  return { ok: true, data: { sampleLinks: [link] } };
}

/** Invites every guardian with an email who isn't using the parent app yet. */
export async function inviteAllParents(subdomain: string): Promise<ActionResult<SampleEmail & { invited: number; withoutEmail: number }>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return fail(ADMINS_ONLY);
  const guardians = store.guardians.filter((g) => g.subdomain === subdomain && childrenOf(subdomain, g.id).length > 0 && parentAccessOf(subdomain, g.id) === "none");
  const withEmail = guardians.filter((g) => g.email);
  const links = withEmail.map((g) => makeInvite(subdomain, g.id));
  if (links.length) recordChange(subdomain, who.fullName, `Invited ${links.length} ${links.length === 1 ? "parent" : "parents"} to the parent app`);
  return { ok: true, data: { invited: links.length, withoutEmail: guardians.length - withEmail.length, sampleLinks: links.slice(0, 3) } };
}

/** Ends a guardian's parent-app access (or cancels their invite). Their child's record is unchanged. */
export async function removeParentAccess(subdomain: string, guardianId: string): Promise<ActionResult<null>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return fail(ADMINS_ONLY);
  const g = store.guardians.find((x) => x.subdomain === subdomain && x.id === guardianId);
  if (!g) return fail("That guardian isn’t here any more.");
  store.invites = store.invites.filter((i) => !(i.subdomain === subdomain && i.role === "parent" && i.guardianId === guardianId && !i.usedAt));
  const userIds = store.parentLinks.filter((l) => l.guardianId === guardianId).map((l) => l.userId);
  store.parentLinks = store.parentLinks.filter((l) => l.guardianId !== guardianId);
  for (const user of store.users.filter((u) => userIds.includes(u.id))) {
    // Still a parent here through another guardian record (another family)? Keep the account.
    if (!store.parentLinks.some((l) => l.userId === user.id)) user.schools = user.schools.filter((s) => !(s.subdomain === subdomain && s.role === "parent"));
  }
  recordChange(subdomain, who.fullName, `Ended ${g.name}’s parent app access`);
  return { ok: true, data: null };
}

// ——— What parents see ———

export async function getParentHome(subdomain: string): Promise<ParentHome | null> {
  const parent = await requireParent(subdomain);
  if (!parent) return null;
  const today = todayInLagos();
  const terms = termsOf(subdomain);
  const term = termOf(today, terms);
  const days = term ? schoolDaysSoFar(term, today).slice(0, 10) : [];
  const children = parent.guardianIds
    .flatMap((id) => childrenOf(subdomain, id))
    .filter((s) => s.status === "active")
    .map((s) => {
      const formTeacherId = store.formTeachers.find((f) => f.armId === s.armId)?.userId;
      return {
        id: s.id,
        fullName: fullName(s),
        armLabel: armLabelOf(subdomain, s.armId),
        admissionNo: s.admissionNo,
        formTeacher: store.users.find((u) => u.id === formTeacherId)?.fullName ?? null,
        attendance: attendanceOf(subdomain, s.id),
        recent: days.map((date) => ({ date, mark: store.marks.find((m) => m.studentId === s.id && m.date === date)?.mark ?? null })),
        results: resultsFor(subdomain, s.id),
      };
    });
  return { fullName: parent.user.fullName, schoolDay: days[0] === today, children };
}

/** This term's results for a parent: nothing but the term's name until the class is published. */
function resultsFor(subdomain: string, studentId: string): ParentHome["children"][number]["results"] {
  const term = resultsTermOf(subdomain);
  if (!term) return null;
  const card = buildReportCard(subdomain, studentId);
  const label = `${term.name}, ${term.session}`;
  if (!card?.published) return { term: label, published: false };
  return { term: label, published: true, average: card.average, position: card.position, of: card.of };
}

/** A child's report card, for their parent: their own children only, and only once published. */
export async function getParentReportCard(subdomain: string, studentId: string): Promise<ReportCardData | null> {
  const parent = await requireParent(subdomain);
  if (!parent) return null;
  const child = store.students.find((s) => s.subdomain === subdomain && s.id === studentId && !s.deletedAt && s.guardianId && parent.guardianIds.includes(s.guardianId));
  if (!child) return null;
  const card = buildReportCard(subdomain, studentId);
  return card?.published ? card : null;
}
