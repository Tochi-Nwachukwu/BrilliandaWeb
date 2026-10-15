// FAKE: books and things needed (batch 20) on sample data. The backend replaces this with a list
// per school, class level and session, shown to parents once shared.
import "server-only";
import type { BookItem } from "@brillianda/core/booklists";
import { sessionName } from "@brillianda/core/signup";
import type { ActionResult, BookList, BookListsPage, ParentChild } from "../types";
import { requireMember } from "./auth";
import { recordChange } from "./changes";
import { store } from "./store";

const pause = () => new Promise((resolve) => setTimeout(resolve, 300));
const ADMINS_ONLY = "Only the school’s owner and admins can do this.";

/** The school's current session: its calendar's, or this school year's until one is saved. */
function currentYear(subdomain: string): number {
  const saved = store.calendars.get(subdomain);
  if (saved) return saved.startYear;
  const today = new Date();
  return today.getUTCMonth() >= 7 ? today.getUTCFullYear() : today.getUTCFullYear() - 1;
}

const levelsOf = (subdomain: string) => store.levels.filter((l) => l.subdomain === subdomain && !l.archived).sort((a, b) => a.position - b.position);

function listFor(subdomain: string, levelId: string, startYear: number): BookList {
  const level = store.levels.find((l) => l.id === levelId);
  const saved = store.bookLists.find((b) => b.subdomain === subdomain && b.levelId === levelId && b.startYear === startYear);
  return {
    levelId,
    levelName: level?.name ?? "",
    startYear,
    session: sessionName(startYear),
    items: saved?.items.map((i) => ({ ...i })) ?? [],
    shared: saved?.shared ?? false,
    updated: saved ? { by: saved.by, at: saved.at } : null,
  };
}

export async function getBookLists(subdomain: string, startYear?: number): Promise<BookListsPage | null> {
  if (!(await requireMember(subdomain))) return null;
  const now = currentYear(subdomain);
  // This session and the next; lists for other years aren't edited here.
  const year = startYear === now ? now : now + 1;
  return {
    startYear: year,
    session: sessionName(year),
    sessions: [
      { startYear: now + 1, name: sessionName(now + 1), label: "Next session" },
      { startYear: now, name: sessionName(now), label: "This session" },
    ],
    lists: levelsOf(subdomain).map((l) => listFor(subdomain, l.id, year)),
  };
}

function saved(subdomain: string, levelId: string, startYear: number, by: string) {
  let entry = store.bookLists.find((b) => b.subdomain === subdomain && b.levelId === levelId && b.startYear === startYear);
  if (!entry) {
    entry = { subdomain, levelId, startYear, items: [], shared: false, by, at: Date.now() };
    store.bookLists.push(entry);
  }
  entry.by = by;
  entry.at = Date.now();
  return entry;
}

function check(subdomain: string, levelId: string, startYear: number): string | null {
  if (!store.levels.some((l) => l.subdomain === subdomain && l.id === levelId)) return "That class isn’t here any more.";
  const now = currentYear(subdomain);
  return startYear === now || startYear === now + 1 ? null : "Lists are for this session or the next.";
}

/** Replaces a class level's list. Items without an id get one. */
export async function saveBookList(subdomain: string, levelId: string, startYear: number, items: (BookItem & { id?: string })[]): Promise<ActionResult<null>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return { ok: false, error: ADMINS_ONLY };
  const problem = check(subdomain, levelId, startYear);
  if (problem) return { ok: false, error: problem };
  const entry = saved(subdomain, levelId, startYear, who.fullName);
  entry.items = items.map((i) => ({ ...i, id: i.id || crypto.randomUUID() }));
  return { ok: true, data: null };
}

export async function setBookListShared(subdomain: string, levelId: string, startYear: number, shared: boolean): Promise<ActionResult<null>> {
  await pause();
  const who = await requireMember(subdomain);
  if (!who) return { ok: false, error: ADMINS_ONLY };
  const problem = check(subdomain, levelId, startYear);
  if (problem) return { ok: false, error: problem };
  const entry = saved(subdomain, levelId, startYear, who.fullName);
  if (shared && !entry.items.length) return { ok: false, error: "Add something to the list before sharing it." };
  entry.shared = shared;
  const level = store.levels.find((l) => l.id === levelId)!;
  recordChange(subdomain, who.fullName, `${shared ? "Shared" : "Stopped sharing"} the ${level.name} book list for ${sessionName(startYear)}`);
  return { ok: true, data: null };
}

/** For the parent app: the shared lists for the child's class this session, and the class they move into next. */
export function bookListsFor(subdomain: string, armId: string): ParentChild["bookLists"] {
  const arm = store.arms.find((a) => a.id === armId);
  if (!arm) return [];
  const now = currentYear(subdomain);
  const levels = levelsOf(subdomain);
  const here = levels.findIndex((l) => l.id === arm.levelId);
  const next = here >= 0 ? levels[here + 1] : undefined;
  const out: ParentChild["bookLists"] = [];
  if (next) {
    const list = listFor(subdomain, next.id, now + 1);
    if (list.shared && list.items.length) out.push({ label: `For next session: ${list.levelName}, ${list.session}`, list });
  }
  const current = listFor(subdomain, arm.levelId, now);
  if (current.shared && current.items.length) out.push({ label: `This session: ${current.levelName}, ${current.session}`, list: current });
  return out;
}
