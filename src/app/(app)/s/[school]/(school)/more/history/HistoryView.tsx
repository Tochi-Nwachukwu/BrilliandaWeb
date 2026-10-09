"use client";

import { Card } from "@brillianda/ui/Cards";
import { cx } from "@brillianda/ui/cx";
import { EmptyState } from "@brillianda/ui/EmptyState";
import { SelectField, TextField } from "@brillianda/ui/TextField";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { ChangeFilter, ChangeLog } from "@/data/types";
import { plural } from "@/lib/time";

const ZONE = "Africa/Lagos";
const dayOf = (at: number) => new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
const timeOf = (at: number) => new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(at);

function dayHeading(day: string, now: number) {
  const today = dayOf(now);
  const yesterday = dayOf(now - 86_400_000);
  if (day === today) return "Today";
  if (day === yesterday) return "Yesterday";
  const sameYear = day.slice(0, 4) === today.slice(0, 4);
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", ...(sameYear ? {} : { year: "numeric" }) });
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** More › Change history: filters in the address (so a filtered view can be shared), grouped by day. */
export function HistoryView({ school, log, filter, now }: { school: string; log: ChangeLog; filter: ChangeFilter & { show: number }; now: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(filter.search ?? "");
  const base = `/s/${school}/more/history`;

  const query = (patch: Record<string, string | number | undefined>) => {
    const next = { who: filter.who, q: filter.search, from: filter.from, to: filter.to, student: filter.studentId, ...patch };
    const params = new URLSearchParams(Object.entries(next).filter((e): e is [string, string] => e[1] !== undefined && e[1] !== "").map(([k, v]) => [k, String(v)]));
    const text = params.toString();
    return text ? `?${text}` : "";
  };
  const go = (patch: Record<string, string | number | undefined>) => startTransition(() => router.replace(`${base}${query(patch)}`, { scroll: false }));

  // Search as you type, a moment after the typing stops.
  useEffect(() => {
    if ((filter.search ?? "") === search.trim()) return;
    const timer = setTimeout(() => go({ q: search.trim() || undefined }), 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the typed words restart the wait
  }, [search]);

  const filtered = Boolean(filter.who || filter.search || filter.from || filter.to || filter.studentId);
  const groups: { day: string; entries: ChangeLog["entries"] }[] = [];
  for (const entry of log.entries) {
    const day = dayOf(entry.at);
    if (groups.at(-1)?.day !== day) groups.push({ day, entries: [] });
    groups.at(-1)!.entries.push(entry);
  }

  return (
    <>
      <Card>
        <div className="grid gap-4">
          {log.student && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-accent-soft px-4 py-3 text-sm">
              <span>
                Only changes to{" "}
                <Link href={`/s/${school}/students/${log.student.id}`} className="font-semibold text-accent hover:underline">
                  {log.student.name}
                </Link>
              </span>
              <button type="button" onClick={() => go({ student: undefined })} className="font-medium text-accent hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
                Show everyone
              </button>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <TextField label="Search the history" type="search" placeholder="A name, a class, a word" value={search} onChange={(e) => setSearch(e.target.value)} />
            <SelectField label="Who" value={filter.who ?? ""} onChange={(e) => go({ who: e.target.value || undefined })}>
              <option value="">Everyone</option>
              {log.people.map((person) => (
                <option key={person} value={person}>
                  {person}
                </option>
              ))}
            </SelectField>
            <TextField label="From" type="date" value={filter.from ?? ""} max={filter.to} onChange={(e) => go({ from: e.target.value || undefined })} />
            <TextField label="To" type="date" value={filter.to ?? ""} min={filter.from} onChange={(e) => go({ to: e.target.value || undefined })} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <p aria-live="polite" className={cx("text-text-secondary", pending && "opacity-60")}>
              {log.total === 0 ? "No changes match." : `${plural(log.total, "change")}${filtered ? " match" : " in all"}.`}
              {filtered && (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      startTransition(() => router.replace(base, { scroll: false }));
                    }}
                    className="font-medium text-accent hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    Clear filters
                  </button>
                </>
              )}
            </p>
            {log.total > 0 && (
              <a
                href={`${base}/export${query({})}`}
                download
                className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-raise px-4 font-medium shadow-raised hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
              >
                Download CSV
              </a>
            )}
          </div>
        </div>
      </Card>

      {groups.length ? (
        <div className={cx("grid gap-4 transition-opacity", pending && "opacity-60")}>
          {groups.map((group) => (
            <section key={group.day} aria-labelledby={`day-${group.day}`} className="rounded-3xl bg-surface p-5 shadow-raised sm:p-6">
              <h2 id={`day-${group.day}`} className="mb-3 text-[15px] font-semibold">
                {dayHeading(group.day, now)}
              </h2>
              <ol className="grid gap-1">
                {group.entries.map((entry) => (
                  <li key={entry.id} className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-3 rounded-xl py-1.5 text-sm">
                    <time dateTime={new Date(entry.at).toISOString()} className="pt-px tabular-nums text-text-muted">
                      {timeOf(entry.at)}
                    </time>
                    <span className="min-w-0">
                      <button type="button" onClick={() => go({ who: entry.who })} className="font-semibold hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent" title={`Only ${entry.who}`}>
                        {entry.who}
                      </button>{" "}
                      <span className="text-text-secondary">{lower(entry.what)}</span>
                      {entry.student && !filter.studentId && (
                        <>
                          {" · "}
                          <Link href={`${base}${query({ student: entry.student.id })}`} className="text-accent underline decoration-1 underline-offset-2">
                            {entry.student.name}
                          </Link>
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
          {log.total > log.entries.length && (
            <div className="flex justify-center">
              <Link
                href={`${base}${query({ show: filter.show + 50 })}`}
                scroll={false}
                replace
                className="inline-flex min-h-[44px] items-center rounded-full bg-raise px-5 text-sm font-medium shadow-raised hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
              >
                Show more ({plural(log.total - log.entries.length, "older change")})
              </Link>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <EmptyState title={filtered ? "Nothing matches" : "Nothing yet"}>
            {filtered ? "Try fewer words, another person or wider dates." : "Changes to classes, subjects and students show here, with who made them."}
          </EmptyState>
        </Card>
      )}
    </>
  );
}
