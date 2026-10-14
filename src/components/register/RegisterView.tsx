"use client";

import { MARK_LABEL, MARKS, type Mark } from "@brillianda/core/attendance";
import { Alert } from "@brillianda/ui/Alert";
import { Button } from "@brillianda/ui/Button";
import { cx } from "@brillianda/ui/cx";
import { EmptyState } from "@brillianda/ui/EmptyState";
import { SelectField } from "@brillianda/ui/TextField";
import { toast } from "@brillianda/ui/Toast";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult, Register } from "@/data/types";

const TONE: Record<Mark, string> = {
  present: "peer-checked:bg-success-bg peer-checked:text-success peer-checked:shadow-[inset_0_0_0_1.5px_currentColor]",
  late: "peer-checked:bg-warning-bg peer-checked:text-warning peer-checked:shadow-[inset_0_0_0_1.5px_currentColor]",
  absent: "peer-checked:bg-danger-bg peer-checked:text-danger peer-checked:shadow-[inset_0_0_0_1.5px_currentColor]",
};

const dayLabel = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
const timeLabel = (at: number) => new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", hour: "2-digit", minute: "2-digit", hourCycle: "h23", day: "numeric", month: "short" }).format(at);

/**
 * One class's register for one day (batch 11): a mark for every student, then one save. The same
 * screen for the form teacher and for admins. Changing a saved register keeps who took it and who
 * changed it.
 */
/** `dayHref` is this page's address without a day; the day picker adds `date=`. */
export function RegisterView({ register, save, dayHref }: { register: Register; save: (input: unknown) => Promise<ActionResult<{ present: number; absent: number }>>; dayHref: string }) {
  const router = useRouter();
  const [marks, setMarks] = useState<Record<string, Mark | null>>(() => Object.fromEntries(register.students.map((s) => [s.id, s.mark])));
  const [notes, setNotes] = useState<Record<string, string>>(() => Object.fromEntries(register.students.map((s) => [s.id, s.note])));
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const readOnly = register.problem !== null;

  const counts = { present: 0, late: 0, absent: 0, unmarked: 0 };
  for (const s of register.students) {
    const m = marks[s.id];
    if (m) counts[m]++;
    else counts.unmarked++;
  }
  const changed = register.students.some((s) => marks[s.id] !== s.mark || (notes[s.id] ?? "") !== s.note);

  const setMark = (id: string, mark: Mark) => {
    setMarks((all) => ({ ...all, [id]: mark }));
    setFailure(null);
  };
  const markRestPresent = () => setMarks((all) => Object.fromEntries(Object.entries(all).map(([id, m]) => [id, m ?? "present"])));

  const submit = () => {
    if (counts.unmarked) return setFailure(`Mark ${counts.unmarked === 1 ? "the last student" : `the ${counts.unmarked} students left`}, then save.`);
    startTransition(async () => {
      const result = await save({
        date: register.date,
        marks: register.students.map((s) => ({ studentId: s.id, mark: marks[s.id], ...(notes[s.id]?.trim() ? { note: notes[s.id]!.trim() } : {}) })),
      });
      if (!result.ok) return setFailure(result.error);
      toast(register.taken ? "Register updated" : `Register saved: ${result.data.present} present, ${result.data.absent} absent`);
      router.refresh();
    });
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 rounded-3xl bg-surface p-5 shadow-raised sm:grid-cols-[minmax(0,1fr)_minmax(0,18rem)] sm:items-end sm:p-6">
        <div className="min-w-0">
          <h2 className="text-[19px] font-semibold tracking-[-0.02em]">{dayLabel(register.date)}</h2>
          <p className="mt-1 text-sm text-text-secondary">
            {register.taken
              ? `Taken by ${register.taken.by}, ${timeLabel(register.taken.at)}${register.taken.updatedBy ? `. Changed by ${register.taken.updatedBy}, ${timeLabel(register.taken.updatedAt!)}` : ""}.`
              : readOnly
                ? "No register for this day."
                : "Not taken yet."}
          </p>
        </div>
        {register.days.length > 0 && (
          <SelectField label="Day" value={register.date} onChange={(e) => router.push(`${dayHref}${dayHref.includes("?") ? "&" : "?"}date=${e.target.value}`)}>
            {!register.days.some((d) => d.date === register.date) && <option value={register.date}>{dayLabel(register.date)}</option>}
            {register.days.map((d) => (
              <option key={d.date} value={d.date}>
                {dayLabel(d.date)}
                {d.taken ? " ✓" : ""}
              </option>
            ))}
          </SelectField>
        )}
      </div>

      {readOnly && <Alert tone="info">{register.problem}</Alert>}

      {register.students.length === 0 ? (
        <div className="rounded-3xl bg-surface p-6 shadow-raised">
          <EmptyState title="No students in this class">Students added to {register.armLabel} show here.</EmptyState>
        </div>
      ) : (
        <section aria-label={`Register for ${register.armLabel}`} className="rounded-3xl bg-surface p-2 shadow-raised sm:p-3">
          {!readOnly && counts.unmarked > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-2 pt-2 text-sm">
              <span className="text-text-secondary">Most days, mark the absent and late students, then mark the rest present.</span>
              <Button size="sm" variant="secondary" onClick={markRestPresent}>
                Mark the rest present
              </Button>
            </div>
          )}
          <ol className="grid">
            {register.students.map((s, i) => {
              const mark = marks[s.id];
              return (
                <li key={s.id} className={cx("grid gap-2 rounded-2xl px-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center", i % 2 === 1 && "bg-[color-mix(in_oklab,var(--color-sunken)_55%,transparent)]")}>
                  <div className="min-w-0">
                    <b className="block truncate font-semibold">{s.fullName}</b>
                    <span className="text-[12.5px] text-text-secondary">{s.admissionNo}</span>
                  </div>
                  <fieldset disabled={readOnly || pending} className="flex gap-1.5">
                    <legend className="sr-only">{s.fullName}</legend>
                    {MARKS.map((m) => (
                      <label key={m} className="relative">
                        <input type="radio" name={`mark-${s.id}`} value={m} checked={mark === m} onChange={() => setMark(s.id, m)} className="peer sr-only" />
                        <span
                          className={cx(
                            "inline-flex min-h-[40px] min-w-[4.75rem] cursor-pointer items-center justify-center rounded-full bg-raise px-3 text-[13px] font-medium text-text-secondary shadow-raised transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent peer-disabled:cursor-default",
                            TONE[m],
                          )}
                        >
                          {MARK_LABEL[m]}
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  {(mark === "late" || mark === "absent" || notes[s.id]) && (
                    <label className="sm:col-span-2">
                      <span className="sr-only">Note for {s.fullName}</span>
                      <input
                        value={notes[s.id] ?? ""}
                        onChange={(e) => setNotes((all) => ({ ...all, [s.id]: e.target.value }))}
                        disabled={readOnly || pending}
                        maxLength={120}
                        placeholder={mark === "absent" ? "Reason, if known (optional)" : "Note (optional)"}
                        className="min-h-[40px] w-full rounded-xl bg-field px-3 text-sm outline-hidden placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-accent"
                      />
                    </label>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {failure && <Alert tone="danger">{failure}</Alert>}

      {!readOnly && register.students.length > 0 && (
        <div className="sticky bottom-[92px] z-10 flex items-center justify-between gap-2 rounded-[22px] bg-[color-mix(in_oklab,var(--color-surface)_92%,transparent)] p-2 pl-4 shadow-float backdrop-blur-md md:bottom-3">
          <p className="text-sm text-text-secondary" aria-live="polite">
            {counts.present + counts.late} present{counts.late ? ` (${counts.late} late)` : ""}, {counts.absent} absent
            {counts.unmarked ? `, ${counts.unmarked} to mark` : ""}
          </p>
          <Button onClick={submit} loading={pending} disabled={register.taken !== null && !changed}>
            {register.taken ? "Save changes" : "Save register"}
          </Button>
        </div>
      )}
    </div>
  );
}
