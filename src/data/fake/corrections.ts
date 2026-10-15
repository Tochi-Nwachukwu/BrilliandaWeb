// FAKE: parents' correction requests (batch 21) on sample data. The backend replaces this with a
// stored request per child; approving one changes the student's (or guardian's) record in one go
// and writes it to the change history.
import "server-only";
import { CORRECTION_LABEL_FOR_SCHOOL, type CorrectableField, type CorrectionRequest } from "@brillianda/core/corrections";
import { fullName } from "@brillianda/core/students";
import type { ActionResult, ChildDetails, CorrectionRow, CorrectionsPage } from "../types";
import { requireMember, requireParent } from "./auth";
import { recordChange } from "./changes";
import { store, type FakeStudent } from "./store";
import { armOptions } from "./students";

const pause = () => new Promise((resolve) => setTimeout(resolve, 300));
const ADMINS_ONLY = "Only the school’s owner and admins can do this.";

const guardianOf = (s: FakeStudent) => store.guardians.find((g) => g.id === s.guardianId) ?? null;

/** What the record says now, for one field. */
function current(s: FakeStudent, field: CorrectableField): string {
  if (field === "guardianPhone") return guardianOf(s)?.phone ?? "";
  if (field === "guardianEmail") return guardianOf(s)?.email ?? "";
  return String(s[field] ?? "");
}

export function detailsOf(s: FakeStudent): ChildDetails {
  const g = guardianOf(s);
  return {
    firstName: s.firstName,
    otherNames: s.otherNames,
    lastName: s.lastName,
    dateOfBirth: s.dateOfBirth,
    gender: s.gender,
    admissionDate: s.admissionDate,
    stateOfOrigin: s.stateOfOrigin,
    address: s.address,
    guardian: g ? { name: g.name, phone: g.phone, email: g.email } : null,
  };
}

function rowOf(subdomain: string, c: (typeof store.corrections)[number]): CorrectionRow {
  const s = store.students.find((x) => x.id === c.studentId);
  return {
    id: c.id,
    at: c.at,
    studentId: c.studentId,
    studentName: s ? fullName(s) : "A student",
    armLabel: (s && armOptions(subdomain).find((a) => a.id === s.armId)?.label) ?? "",
    by: c.by,
    changes: c.changes,
    note: c.note,
    status: c.status,
    decided: c.decided ?? null,
  };
}

/** A parent's own requests for one child, newest first. */
export function correctionsFor(subdomain: string, studentId: string): CorrectionRow[] {
  return store.corrections
    .filter((c) => c.subdomain === subdomain && c.studentId === studentId)
    .sort((a, b) => b.at - a.at)
    .slice(0, 5)
    .map((c) => rowOf(subdomain, c));
}

export async function requestCorrection(subdomain: string, studentId: string, input: CorrectionRequest): Promise<ActionResult<null>> {
  await pause();
  const parent = await requireParent(subdomain);
  const s = parent && store.students.find((x) => x.subdomain === subdomain && x.id === studentId && !x.deletedAt && x.guardianId && parent.guardianIds.includes(x.guardianId));
  if (!parent || !s) return { ok: false, error: "You can ask about your own children only." };
  // Only what would actually change.
  const changes = input.changes.map((c) => ({ field: c.field, from: current(s, c.field), to: c.value })).filter((c) => c.from !== c.to);
  if (!changes.length) return { ok: false, error: "That’s what the record already says." };
  store.corrections.push({ id: crypto.randomUUID(), subdomain, studentId, by: parent.user.fullName, at: Date.now(), changes, note: input.note, status: "open" });
  return { ok: true, data: null };
}

export async function getCorrections(subdomain: string): Promise<CorrectionsPage | null> {
  if (!(await requireMember(subdomain))) return null;
  const mine = store.corrections.filter((c) => c.subdomain === subdomain).sort((a, b) => b.at - a.at);
  return {
    open: mine.filter((c) => c.status === "open").map((c) => rowOf(subdomain, c)),
    answered: mine
      .filter((c) => c.status !== "open")
      .slice(0, 20)
      .map((c) => rowOf(subdomain, c)),
  };
}

/** How many requests are waiting, for the More tab's count. */
export async function countOpenCorrections(subdomain: string): Promise<number> {
  if (!(await requireMember(subdomain))) return 0;
  return store.corrections.filter((c) => c.subdomain === subdomain && c.status === "open").length;
}

export async function resolveCorrection(subdomain: string, id: string, approve: boolean, reason: string | null): Promise<ActionResult<null>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return { ok: false, error: ADMINS_ONLY };
  const c = store.corrections.find((x) => x.subdomain === subdomain && x.id === id);
  if (!c || c.status !== "open") return { ok: false, error: "This request has already been answered." };
  const s = store.students.find((x) => x.id === c.studentId && !x.deletedAt);
  if (!s) return { ok: false, error: "That student isn’t here any more." };
  if (approve) {
    const g = guardianOf(s);
    for (const change of c.changes) {
      if (change.field === "guardianPhone" || change.field === "guardianEmail") {
        if (!g) return { ok: false, error: `${fullName(s)} has no guardian on record. Add one from Edit first.` };
        if (change.field === "guardianPhone") g.phone = change.to;
        else g.email = change.to || null;
      } else if (change.field === "gender") {
        s.gender = change.to as FakeStudent["gender"];
      } else {
        s[change.field] = change.to;
      }
    }
    s.updatedAt = Date.now();
    const what = c.changes.map((ch) => CORRECTION_LABEL_FOR_SCHOOL[ch.field].toLowerCase()).join(", ");
    recordChange(subdomain, who.fullName, `Corrected ${fullName(s)}’s ${what}, as ${c.by} asked`, s.id);
  } else {
    recordChange(subdomain, who.fullName, `Declined ${c.by}’s correction to ${fullName(s)}’s details`, s.id);
  }
  c.status = approve ? "approved" : "declined";
  c.decided = { by: who.fullName, at: Date.now(), reason: approve ? null : reason };
  return { ok: true, data: null };
}
