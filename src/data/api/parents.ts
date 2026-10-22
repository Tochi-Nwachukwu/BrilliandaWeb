// Parents, on the Brillianda API. Same functions and shapes as ../fake/parents.ts.
import "server-only";
import type { ActionResult, ParentChild, ParentHome, ParentsPage, ReportCardData, SampleEmail } from "../types";
import { api, fail, read } from "./client";
import { outboxSample } from "./outbox";

const id = encodeURIComponent;

export async function getParentsPage(subdomain: string): Promise<ParentsPage | null> {
  return read<ParentsPage>(subdomain, "/v1/parents");
}

/** Invites one guardian by the email on their record (again: a new link). */
export async function inviteParent(subdomain: string, guardianId: string): Promise<ActionResult<SampleEmail>> {
  const since = Date.now();
  const result = await api<{ access: "invited" | "active"; resent: boolean }>(subdomain, `/v1/guardians/${id(guardianId)}/invite`, { method: "POST" });
  if (!result.ok) return fail(result);
  const email = (await getParentsPage(subdomain))?.guardians.find((g) => g.id === guardianId)?.email;
  return { ok: true, data: email ? await outboxSample(email, since) : {} };
}

type InviteAll = { invited: number; withoutEmail: number; skipped: number; remaining: number };

/** Invites every guardian with an email who isn't invited yet. The API does 50 a call. */
export async function inviteAllParents(subdomain: string): Promise<ActionResult<SampleEmail & { invited: number; withoutEmail: number }>> {
  let invited = 0;
  let withoutEmail = 0;
  for (let round = 0; round < 20; round++) {
    const result = await api<InviteAll>(subdomain, "/v1/parents/invite-all", { method: "POST" });
    if (!result.ok) return invited ? { ok: true, data: { invited, withoutEmail } } : fail(result);
    invited += result.data.invited;
    withoutEmail = result.data.withoutEmail;
    if (result.data.remaining <= 0 || result.data.invited === 0) break;
  }
  return { ok: true, data: { invited, withoutEmail } };
}

/** Ends a guardian's parent-app access, or cancels their invite. */
export async function removeParentAccess(subdomain: string, guardianId: string): Promise<ActionResult<null>> {
  const result = await api(subdomain, `/v1/guardians/${id(guardianId)}/access`, { method: "DELETE" });
  return result.ok ? { ok: true, data: null } : fail(result);
}

type ApiChild = Pick<ParentChild, "id" | "fullName" | "armLabel" | "admissionNo" | "formTeacher" | "attendance" | "recent" | "results" | "pastTerms">;

export async function getParentHome(subdomain: string): Promise<ParentHome | null> {
  const home = await read<{ fullName: string; schoolDay: boolean; children: ApiChild[] }>(subdomain, "/v1/me/children");
  if (!home) return null;
  // Birthdays, book lists, a child's record and corrections aren't on the API yet: those parts stay hidden.
  return { ...home, children: home.children.map((c) => ({ ...c, birthday: null, bookLists: [], details: null, corrections: [] })) };
}

/** Their own child's report card, published terms only; anything else is null. */
export async function getParentReportCard(subdomain: string, studentId: string, termKey?: string): Promise<ReportCardData | null> {
  return read<ReportCardData>(subdomain, `/v1/me/children/${id(studentId)}/report-card`, { term: termKey });
}
