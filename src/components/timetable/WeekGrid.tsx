"use client";

import { DAYS, DAY_NAME, DAY_SHORT, shortTime, type Day, type Period } from "@brillianda/core/timetable";
import { cx } from "@brillianda/ui/cx";
import { useState, type ReactNode } from "react";

/**
 * A week, Monday to Friday, by the school's periods (batch 22). On a laptop: a table, days down the
 * side. On a phone: one day at a time, picked from the days. `cell` draws a lesson period; `marked`
 * highlights it (a teacher's own lessons).
 */
export function WeekGrid({
  label,
  periods,
  today,
  cell,
  marked = () => false,
}: {
  label: string;
  periods: Period[];
  /** Today, to open the phone view on (null at weekends: Monday). */
  today: Day | null;
  cell: (day: Day, period: Period) => ReactNode;
  marked?: (day: Day, period: Period) => boolean;
}) {
  const [day, setDay] = useState<Day>(today ?? 1);
  const markedClass = "bg-accent-soft shadow-[inset_0_0_0_1.5px_var(--color-accent)]";

  return (
    <>
      {/* Laptop: the whole week. */}
      <div className="hidden overflow-x-auto rounded-3xl bg-surface p-3 shadow-raised md:block">
        <table className="w-full border-separate border-spacing-1 text-sm">
          <caption className="sr-only">{label}</caption>
          <thead>
            <tr>
              <th scope="col" className="w-14 p-1.5 text-left text-[12.5px] font-medium text-text-secondary">
                <span className="sr-only">Day</span>
              </th>
              {periods.map((p) => (
                <th key={p.id} scope="col" className={cx("p-1.5 text-left align-bottom font-medium", p.kind === "break" && "w-6")}>
                  {p.kind === "break" ? (
                    <span className="sr-only">{p.label}</span>
                  ) : (
                    <>
                      <span className="block text-[13px]">{p.label}</span>
                      <span className="block text-[11.5px] font-normal text-text-secondary">
                        {shortTime(p.start)}–{shortTime(p.end)}
                      </span>
                    </>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS.map((d) => (
              <tr key={d}>
                <th scope="row" className={cx("p-2 text-left font-semibold", d === today && "text-accent")}>
                  {DAY_SHORT[d]}
                  {d === today && <span className="block text-[11px] font-medium">Today</span>}
                </th>
                {periods.map((p) =>
                  p.kind === "break" ? (
                    <td key={p.id} aria-label={p.label} className="rounded-xl bg-sunken/60" />
                  ) : (
                    <td key={p.id} className={cx("min-w-[5.75rem] rounded-xl bg-sunken p-1 align-top", marked(d, p) && markedClass)}>
                      {cell(d, p)}
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone: one day at a time. */}
      <div className="md:hidden">
        <div role="group" aria-label="Day" className="mb-3 grid grid-cols-5 gap-1 rounded-full bg-sunken p-1">
          {DAYS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={d === day}
              aria-label={DAY_NAME[d]}
              onClick={() => setDay(d)}
              className={cx(
                "h-10 rounded-full text-sm font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent",
                d === day ? "bg-raise text-text-primary shadow-raised" : "text-text-secondary",
              )}
            >
              {DAY_SHORT[d]}
            </button>
          ))}
        </div>
        <ol aria-label={`${label}, ${DAY_NAME[day]}`} className="grid gap-1.5 rounded-3xl bg-surface p-2 shadow-raised">
          {periods.map((p) =>
            p.kind === "break" ? (
              <li key={p.id} className="px-3 py-1 text-[12.5px] text-text-muted">
                {p.label} · {shortTime(p.start)}–{shortTime(p.end)}
              </li>
            ) : (
              <li key={p.id} className={cx("grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3 rounded-2xl bg-sunken p-2.5", marked(day, p) && markedClass)}>
                <span className="text-[12.5px] leading-tight text-text-secondary">
                  <b className="block font-medium text-text-primary">{p.label}</b>
                  {shortTime(p.start)}–{shortTime(p.end)}
                </span>
                <span className="min-w-0">{cell(day, p)}</span>
              </li>
            ),
          )}
        </ol>
      </div>
    </>
  );
}

