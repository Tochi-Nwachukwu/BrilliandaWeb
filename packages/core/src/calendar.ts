// The academic calendar (plan: "Academic calendar"). A session starts in September by default
// and has three terms, as in Lagos State's 2026/2027 calendar: First (September to December),
// Second (January to April), Third (May to July). Names are editable and a session can have two
// or three terms. Dates are ISO days ("2026-09-14"), worked out in UTC so time zones never shift them.
import { z } from "zod";
import { sessionName } from "./signup";

export type Term = { name: string; startsOn: string; endsOn: string };

export const TERM_NAME_PRESETS = {
  nigerian: { label: "First, Second, Third", names: ["First Term", "Second Term", "Third Term"] },
  british: { label: "Autumn, Spring, Summer", names: ["Autumn Term", "Spring Term", "Summer Term"] },
} as const;
export type TermNamePreset = keyof typeof TERM_NAME_PRESETS;

const iso = (d: Date) => d.toISOString().slice(0, 10);
const utc = (year: number, month: number, day: number) => new Date(Date.UTC(year, month - 1, day));

/** The first Monday on or after a day. */
function mondayFrom(year: number, month: number, day: number): string {
  const d = utc(year, month, day);
  d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7));
  return iso(d);
}

/** The last Friday on or before a day. */
function fridayUntil(year: number, month: number, day: number): string {
  const d = utc(year, month, day);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 2) % 7));
  return iso(d);
}

/**
 * Suggested terms for a session starting in `startYear`. Three terms: the second week of
 * September to mid-December, early January to Easter, early May to late July. Two terms split
 * the year at the end of January.
 */
export function defaultTerms(startYear: number, count: 2 | 3 = 3, preset: TermNamePreset = "nigerian"): Term[] {
  const names = TERM_NAME_PRESETS[preset].names;
  const next = startYear + 1;
  if (count === 2) {
    return [
      { name: names[0], startsOn: mondayFrom(startYear, 9, 8), endsOn: fridayUntil(next, 1, 30) },
      { name: names[1], startsOn: mondayFrom(next, 2, 9), endsOn: fridayUntil(next, 7, 24) },
    ];
  }
  return [
    { name: names[0], startsOn: mondayFrom(startYear, 9, 8), endsOn: fridayUntil(startYear, 12, 18) },
    { name: names[1], startsOn: mondayFrom(next, 1, 4), endsOn: fridayUntil(next, 4, 10) },
    { name: names[2], startsOn: mondayFrom(next, 5, 1), endsOn: fridayUntil(next, 7, 24) },
  ];
}

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date");

export const sessionSchema = z
  .object({
    startYear: z.coerce.number().int().min(2000, "Choose a year").max(2100, "Choose a year"),
    terms: z
      .array(
        z.object({
          name: z.string().trim().min(1, "Give the term a name").max(40, "Use at most 40 characters"),
          startsOn: day,
          endsOn: day,
        }),
      )
      .min(2, "A session has two or three terms")
      .max(3, "A session has two or three terms"),
  })
  .superRefine((session, ctx) => {
    session.terms.forEach((term, i) => {
      if (term.endsOn <= term.startsOn) ctx.addIssue({ code: "custom", path: ["terms", i, "endsOn"], message: "Ends after it starts" });
      const before = session.terms[i - 1];
      if (before && term.startsOn <= before.endsOn) ctx.addIssue({ code: "custom", path: ["terms", i, "startsOn"], message: `Starts after ${before.name || "the term before"} ends` });
    });
    const first = session.terms[0];
    if (first && !first.startsOn.startsWith(String(session.startYear)) && !first.startsOn.startsWith(String(session.startYear + 1))) {
      ctx.addIssue({ code: "custom", path: ["terms", 0, "startsOn"], message: `The ${sessionName(session.startYear)} session starts in ${session.startYear}` });
    }
    const names = session.terms.map((t) => t.name.trim().toLowerCase());
    names.forEach((name, i) => {
      if (name && names.indexOf(name) !== i) ctx.addIssue({ code: "custom", path: ["terms", i, "name"], message: "Two terms can’t share a name" });
    });
  });
export type SessionInput = z.infer<typeof sessionSchema>;

/** Where today sits: in a term (with its week), between terms, before the session or after it. */
export type TermPosition =
  | { kind: "in-term"; index: number; week: number; weeks: number }
  | { kind: "break"; nextIndex: number }
  | { kind: "before" }
  | { kind: "after" };

const DAY_MS = 86_400_000;
const days = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / DAY_MS);

export function termPosition(terms: Term[], today: string): TermPosition {
  if (!terms.length || today < terms[0]!.startsOn) return { kind: "before" };
  for (let i = 0; i < terms.length; i++) {
    const t = terms[i]!;
    if (today >= t.startsOn && today <= t.endsOn) {
      return { kind: "in-term", index: i, week: Math.floor(days(t.startsOn, today) / 7) + 1, weeks: Math.ceil((days(t.startsOn, t.endsOn) + 1) / 7) };
    }
    const next = terms[i + 1];
    if (next && today > t.endsOn && today < next.startsOn) return { kind: "break", nextIndex: i + 1 };
  }
  return { kind: "after" };
}

/** Number of teaching weeks in a term, counting part weeks. */
export function termWeeks(term: Term): number {
  return Math.ceil((days(term.startsOn, term.endsOn) + 1) / 7);
}
