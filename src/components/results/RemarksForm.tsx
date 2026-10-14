"use client";

import { RATING_LABELS } from "@brillianda/core/results";
import { cx } from "@brillianda/ui/cx";
import { EmptyState } from "@brillianda/ui/EmptyState";
import { toast } from "@brillianda/ui/Toast";
import { useRef, useState } from "react";
import type { ActionResult, ClassReports } from "@/data/types";

/**
 * Remarks and behaviour ratings for a class (batch 15). Each remark saves when you leave the box;
 * each rating saves as you pick it. The form teacher writes the class teacher's remark; admins
 * write the principal's too.
 */
export function RemarksForm({
  reports,
  saveRemark,
  saveRating,
}: {
  reports: ClassReports;
  saveRemark: (studentId: string, kind: string, input: unknown) => Promise<ActionResult<null>>;
  saveRating: (studentId: string, input: unknown) => Promise<ActionResult<null>>;
}) {
  const [rows, setRows] = useState(reports.rows);
  const saved = useRef(new Map<string, string>(reports.rows.flatMap((r) => [[`${r.studentId}:teacher`, r.teacherRemark], [`${r.studentId}:principal`, r.principalRemark]])));
  const [status, setStatus] = useState<string | null>(null);

  const commitRemark = async (studentId: string, kind: "teacher" | "principal", text: string) => {
    const k = `${studentId}:${kind}`;
    if ((saved.current.get(k) ?? "") === text.trim()) return;
    setStatus("Saving…");
    const result = await saveRemark(studentId, kind, { text });
    if (!result.ok) {
      setStatus(null);
      return toast(result.error);
    }
    saved.current.set(k, text.trim());
    setStatus("Saved");
  };

  const rate = async (studentId: string, trait: string, value: number | null) => {
    setRows((all) => all.map((r) => (r.studentId === studentId ? { ...r, ratings: { ...r.ratings, ...(value === null ? {} : { [trait]: value }) } } : r)));
    const result = await saveRating(studentId, { trait, value });
    if (!result.ok) toast(result.error);
  };

  if (rows.length === 0) {
    return (
      <div className="rounded-3xl bg-surface p-6 shadow-raised">
        <EmptyState title="No students in this class">Students added to {reports.armLabel} show here.</EmptyState>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm text-text-secondary" aria-live="polite">
        Each remark saves when you leave it.{status ? ` ${status}.` : ""}
      </p>
      <ol className="grid gap-3">
        {rows.map((r) => (
          <li key={r.studentId} className="grid gap-4 rounded-3xl bg-surface p-5 shadow-raised">
            <b className="font-semibold">{r.fullName}</b>
            <label className="grid gap-1.5">
              <span className="text-sm font-medium">Class teacher’s remark</span>
              <textarea
                defaultValue={r.teacherRemark}
                maxLength={300}
                rows={2}
                onBlur={(e) => void commitRemark(r.studentId, "teacher", e.target.value)}
                className="w-full rounded-xl bg-field px-3 py-2.5 text-[15px] outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
              />
            </label>
            {reports.canWritePrincipal && (
              <label className="grid gap-1.5">
                <span className="text-sm font-medium">Principal’s remark</span>
                <textarea
                  defaultValue={r.principalRemark}
                  maxLength={300}
                  rows={2}
                  onBlur={(e) => void commitRemark(r.studentId, "principal", e.target.value)}
                  className="w-full rounded-xl bg-field px-3 py-2.5 text-[15px] outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
                />
              </label>
            )}
            {reports.ratings.enabled && reports.ratings.traits.length > 0 && (
              <div className="grid gap-2">
                <span className="text-sm font-medium">Behaviour</span>
                <div className="grid gap-2 sm:grid-cols-2">
                  {reports.ratings.traits.map((trait) => (
                    <fieldset key={trait} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-sunken px-3 py-2">
                      <legend className="sr-only">
                        {trait} for {r.fullName}
                      </legend>
                      <span aria-hidden className="text-sm">
                        {trait}
                      </span>
                      <span className="flex gap-1">
                        {RATING_LABELS.map((label, i) => {
                          const value = i + 1;
                          const on = r.ratings[trait] === value;
                          return (
                            <label key={label} title={label} className="relative">
                              <input type="radio" name={`${r.studentId}-${trait}`} checked={on} onChange={() => void rate(r.studentId, trait, value)} className="peer sr-only" />
                              <span className="sr-only">{`${value}, ${label}`}</span>
                              <span
                                aria-hidden
                                className={cx(
                                  "grid h-9 w-9 cursor-pointer place-items-center rounded-full text-sm font-medium peer-focus-visible:ring-2 peer-focus-visible:ring-accent",
                                  on ? "bg-primary text-primary-text" : "bg-raise shadow-raised",
                                )}
                              >
                                {value}
                              </span>
                            </label>
                          );
                        })}
                      </span>
                    </fieldset>
                  ))}
                </div>
                <p className="text-[12.5px] text-text-secondary">{RATING_LABELS.map((l, i) => `${i + 1} ${l}`).join(" · ")}</p>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
