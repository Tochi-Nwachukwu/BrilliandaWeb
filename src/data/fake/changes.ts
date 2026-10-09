// FAKE: the school's record of changes (the plan's audit log, once the backend has it).
import "server-only";
import { fullName, searchKey } from "@brillianda/core/students";
import type { ChangeFilter, ChangeLog } from "../types";
import { requireMember } from "./auth";
import { store } from "./store";

/** Adds a line to a school's record of changes, optionally about one student. */
export function recordChange(subdomain: string, who: string, what: string, studentId?: string) {
  store.changes.push({ id: crypto.randomUUID(), subdomain, at: Date.now(), who, what, ...(studentId ? { studentId } : {}) });
}

/** Seeded changes are stored as "minutes before the first read"; fix them to real times once. */
export function fixTimes() {
  const now = Date.now();
  for (const change of store.changes) if (change.at <= 0) change.at = now + change.at * 60_000;
}

const lagosDay = (at: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos", year: "numeric", month: "2-digit", day: "2-digit" }).format(at);

function studentOf(subdomain: string, id: string | undefined) {
  const s = id ? store.students.find((x) => x.subdomain === subdomain && x.id === id) : undefined;
  return s ? { id: s.id, name: fullName(s) } : null;
}

export async function listChanges(subdomain: string, filter: ChangeFilter): Promise<ChangeLog | null> {
  if (!(await requireMember(subdomain))) return null;
  fixTimes();
  const all = store.changes.filter((c) => c.subdomain === subdomain);
  const matching = all
    .filter((c) => !filter.who || c.who === filter.who)
    .filter((c) => !filter.studentId || c.studentId === filter.studentId)
    .filter((c) => !filter.from || lagosDay(c.at) >= filter.from!)
    .filter((c) => !filter.to || lagosDay(c.at) <= filter.to!)
    .filter((c) => {
      if (!filter.search) return true;
      const haystack = searchKey(`${c.who} ${c.what} ${studentOf(subdomain, c.studentId)?.name ?? ""}`);
      return searchKey(filter.search).split(" ").every((word) => haystack.includes(word));
    })
    .sort((a, b) => b.at - a.at);
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 1000);
  return {
    entries: matching.slice(0, limit).map(({ id, at, who, what, studentId }) => ({ id, at, who, what, student: studentOf(subdomain, studentId) })),
    total: matching.length,
    people: [...new Set(all.map((c) => c.who))].sort((a, b) => a.localeCompare(b)),
    student: studentOf(subdomain, filter.studentId),
  };
}
