"use client";

import { computeSubjectTotal, formatScore, parseScoreInput, resolveGrade, type CellValue } from "@brillianda/core/grading";
import { asWeighted } from "@brillianda/core/results";
import { Alert } from "@brillianda/ui/Alert";
import { Badge } from "@brillianda/ui/Badge";
import { Button } from "@brillianda/ui/Button";
import { cx } from "@brillianda/ui/cx";
import { EmptyState } from "@brillianda/ui/EmptyState";
import { ResponsiveDialog } from "@brillianda/ui/ResponsiveDialog";
import { TextAreaField } from "@brillianda/ui/TextField";
import { toast } from "@brillianda/ui/Toast";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { FormError } from "@/components/auth/FormError";
import type { ActionResult, ScoreSheetData, SheetStatus } from "@/data/types";
import { timeAgo } from "@/lib/time";

type Cells = Record<string, Record<string, string>>;
type Actions = {
  save: (studentId: string, componentId: string, raw: string) => Promise<ActionResult<{ status: SheetStatus }>>;
  exclude: (studentId: string, excluded: boolean) => Promise<ActionResult<null>>;
  complete: () => Promise<ActionResult<null>>;
  requestUnlock: (input: unknown) => Promise<ActionResult<null>>;
  resolveUnlock: (approve: boolean) => Promise<ActionResult<null>>;
};

const STATUS: Record<SheetStatus, { label: string; tone: "neutral" | "warning" | "success" }> = {
  "not-started": { label: "Not started", tone: "neutral" },
  "in-progress": { label: "In progress", tone: "warning" },
  complete: { label: "Complete", tone: "success" },
};

/**
 * One subject's score sheet for one arm (batch 14). Each box saves when you leave it or press
 * Enter (which moves down to the next student); totals and grades update as you type, with the
 * same maths the server uses (packages/core/grading.ts). An empty box means "not entered yet";
 * ABS means absent and counts as 0.
 */
export function ScoreSheet({ sheet, actions, now }: { sheet: ScoreSheetData; actions: Actions; now: number }) {
  const router = useRouter();
  const [cells, setCells] = useState<Cells>(() => Object.fromEntries(sheet.rows.map((r) => [r.studentId, Object.fromEntries(sheet.components.map((c) => [c.id, formatScore(r.scores[c.id])]))])));
  const saved = useRef<Cells>(structuredClone(cells));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(0);
  const [excluded, setExcluded] = useState<Record<string, boolean>>(() => Object.fromEntries(sheet.rows.map((r) => [r.studentId, r.excluded])));
  const [asking, setAsking] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editable = sheet.canEdit;
  const key = (studentId: string, componentId: string) => `${studentId}:${componentId}`;

  const parsedRow = (studentId: string): Partial<Record<string, CellValue>> => {
    const out: Partial<Record<string, CellValue>> = {};
    for (const c of sheet.components) {
      const p = parseScoreInput(cells[studentId]?.[c.id] ?? "", c.maxScore);
      if (p.ok && p.cell) out[c.id] = p.cell;
    }
    return out;
  };
  const totals = sheet.rows.map((r) => {
    const t = computeSubjectTotal(asWeighted(sheet.components), parsedRow(r.studentId));
    return { studentId: r.studentId, ...t, grade: t.complete ? resolveGrade(t.total, sheet.scale) : null };
  });
  const taking = sheet.rows.filter((r) => !excluded[r.studentId]);
  const completeRows = taking.filter((r) => totals.find((t) => t.studentId === r.studentId)?.complete).length;
  const allIn = completeRows === taking.length && taking.length > 0 && Object.keys(errors).length === 0 && saving === 0;

  const commit = async (studentId: string, componentId: string) => {
    const raw = cells[studentId]?.[componentId] ?? "";
    if (raw === saved.current[studentId]?.[componentId]) return;
    const component = sheet.components.find((c) => c.id === componentId)!;
    const parsed = parseScoreInput(raw, component.maxScore);
    const k = key(studentId, componentId);
    if (!parsed.ok) return setErrors((e) => ({ ...e, [k]: parsed.error }));
    setSaving((n) => n + 1);
    const result = await actions.save(studentId, componentId, raw);
    setSaving((n) => n - 1);
    if (!result.ok) return setErrors((e) => ({ ...e, [k]: result.error }));
    saved.current[studentId] = { ...saved.current[studentId], [componentId]: raw };
    setErrors((e) => {
      const next = { ...e };
      delete next[k];
      return next;
    });
  };

  const focusBelow = (rowIndex: number, componentId: string) => {
    for (let i = rowIndex + 1; i < sheet.rows.length; i++) {
      const next = document.getElementById(`cell-${sheet.rows[i]!.studentId}-${componentId}`) as HTMLInputElement | null;
      if (next && !next.disabled) {
        next.focus();
        next.select();
        return;
      }
    }
  };

  const run = (action: () => Promise<ActionResult<null>>, done: string) =>
    startTransition(async () => {
      setFailure(null);
      const result = await action();
      if (!result.ok) return setFailure(result.error);
      toast(done);
      router.refresh();
    });

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-surface p-5 shadow-raised">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2">
            <b className="font-semibold">
              {sheet.term.name}, {sheet.term.session}
            </b>
            <Badge tone={STATUS[sheet.status].tone}>{STATUS[sheet.status].label}</Badge>
            {sheet.kind === "elective" && <Badge>Elective</Badge>}
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            {sheet.components.map((c) => `${c.name} ${c.maxScore}`).join(" + ")} = 100. Type a score, or ABS if absent.
            {sheet.completedBy && ` Marked complete by ${sheet.completedBy.by}, ${timeAgo(sheet.completedBy.at, now)}.`}
          </p>
        </div>
      </div>

      {sheet.status === "complete" && !sheet.isAdmin && (
        <Alert tone="info">{sheet.unlockRequest ? `You asked to unlock it ${timeAgo(sheet.unlockRequest.at, now)}. An admin will answer.` : "This sheet is marked complete. To change a score, ask an admin to unlock it."}</Alert>
      )}
      {sheet.isAdmin && sheet.unlockRequest && (
        <Alert tone="warning">
          {sheet.unlockRequest.by} asked to unlock it: “{sheet.unlockRequest.reason}”
          <span className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" loading={pending} onClick={() => run(() => actions.resolveUnlock(true), "Unlocked")}>
              Unlock
            </Button>
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => run(() => actions.resolveUnlock(false), "Request declined")}>
              Decline
            </Button>
          </span>
        </Alert>
      )}

      {sheet.rows.length === 0 ? (
        <div className="rounded-3xl bg-surface p-6 shadow-raised">
          <EmptyState title="No students in this class">Students added to {sheet.armLabel} show here.</EmptyState>
        </div>
      ) : (
        <section aria-label={`${sheet.subjectName} scores, ${sheet.armLabel}`} className="rounded-3xl bg-surface p-2 shadow-raised sm:p-3">
          <div aria-hidden className="hidden grid-cols-[minmax(0,1fr)_auto_5.5rem] gap-3 px-3 pb-2 pt-1 text-[12.5px] font-medium text-text-secondary md:grid">
            <span>Student</span>
            <span className="flex gap-2">
              {sheet.components.map((c) => (
                <span key={c.id} className="w-[4.5rem] text-center">
                  {c.name} <span className="font-normal">/{c.maxScore}</span>
                </span>
              ))}
            </span>
            <span className="text-right">Total</span>
          </div>
          <ol className="grid">
            {sheet.rows.map((r, i) => {
              const t = totals[i]!;
              const out = excluded[r.studentId];
              return (
                <li key={r.studentId} className={cx("grid gap-2 rounded-2xl px-3 py-3 md:grid-cols-[minmax(0,1fr)_auto_5.5rem] md:items-center", i % 2 === 1 && "bg-[color-mix(in_oklab,var(--color-sunken)_55%,transparent)]")}>
                  <div className="min-w-0">
                    <b className="block truncate font-semibold">{r.fullName}</b>
                    <span className="text-[12.5px] text-text-secondary">{r.admissionNo}</span>
                    {sheet.kind === "elective" && (
                      <label className="mt-1 flex w-fit items-center gap-2 text-[12.5px]">
                        <input
                          type="checkbox"
                          checked={!out}
                          disabled={!editable || pending}
                          className="h-4 w-4 accent-[var(--color-accent)]"
                          onChange={(e) => {
                            const takes = e.target.checked;
                            setExcluded((x) => ({ ...x, [r.studentId]: !takes }));
                            if (!takes) setCells((all) => ({ ...all, [r.studentId]: Object.fromEntries(sheet.components.map((c) => [c.id, ""])) }));
                            startTransition(async () => {
                              const result = await actions.exclude(r.studentId, !takes);
                              if (!result.ok) {
                                setExcluded((x) => ({ ...x, [r.studentId]: takes }));
                                return toast(result.error);
                              }
                              if (!takes) saved.current[r.studentId] = Object.fromEntries(sheet.components.map((c) => [c.id, ""]));
                            });
                          }}
                        />
                        Takes this subject
                      </label>
                    )}
                  </div>
                  {out ? (
                    <p className="text-sm text-text-secondary md:col-span-2">Doesn’t take {sheet.subjectName}.</p>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {sheet.components.map((c) => {
                          const k = key(r.studentId, c.id);
                          const error = errors[k];
                          return (
                            <label key={c.id} className="grid w-[4.5rem] gap-0.5">
                              <span className="text-[11.5px] text-text-secondary md:sr-only">
                                {c.name} /{c.maxScore}
                              </span>
                              <input
                                id={`cell-${r.studentId}-${c.id}`}
                                aria-label={`${c.name} for ${r.fullName}, out of ${c.maxScore}`}
                                aria-invalid={error ? true : undefined}
                                title={error}
                                inputMode="decimal"
                                autoComplete="off"
                                disabled={!editable}
                                value={cells[r.studentId]?.[c.id] ?? ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  setCells((all) => ({ ...all, [r.studentId]: { ...all[r.studentId], [c.id]: value } }));
                                  if (error) setErrors((x) => ({ ...x, [k]: "" }));
                                }}
                                onBlur={() => void commit(r.studentId, c.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    void commit(r.studentId, c.id);
                                    focusBelow(i, c.id);
                                  }
                                }}
                                className={cx(
                                  "min-h-[44px] w-full rounded-xl bg-field px-2 text-center text-[15px] tabular-nums outline-hidden focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-70",
                                  error && "ring-2 ring-danger",
                                )}
                              />
                              {error && <span className="text-[11.5px] leading-tight text-danger">{error}</span>}
                            </label>
                          );
                        })}
                      </div>
                      <p className="text-sm md:text-right" aria-live="polite">
                        {t.complete ? (
                          <>
                            <b className="text-[17px] font-semibold tabular-nums">{t.total}</b>{" "}
                            <span className="font-medium">{t.grade?.grade}</span>
                          </>
                        ) : (
                          <span className="text-text-secondary">—</span>
                        )}
                      </p>
                    </>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      <FormError message={failure} />

      {sheet.rows.length > 0 && (
        <div className="sticky bottom-[92px] z-10 flex flex-wrap items-center justify-between gap-2 rounded-[22px] bg-[color-mix(in_oklab,var(--color-surface)_92%,transparent)] p-2 pl-4 shadow-float backdrop-blur-md md:bottom-3">
          <p className="text-sm text-text-secondary" aria-live="polite">
            {saving > 0 ? "Saving…" : `${completeRows} of ${taking.length} students complete`}
          </p>
          {sheet.status === "complete" ? (
            sheet.isAdmin ? (
              !sheet.unlockRequest && (
                <Button variant="secondary" loading={pending} onClick={() => run(() => actions.resolveUnlock(true), "Unlocked")}>
                  Unlock for the teacher
                </Button>
              )
            ) : (
              !sheet.unlockRequest && (
                <Button variant="secondary" onClick={() => setAsking(true)}>
                  Ask to unlock
                </Button>
              )
            )
          ) : (
            editable && (
              <Button loading={pending} disabled={!allIn} onClick={() => run(actions.complete, "Marked complete")}>
                Mark complete
              </Button>
            )
          )}
        </div>
      )}

      {asking && <UnlockDialog request={actions.requestUnlock} onClose={() => setAsking(false)} onDone={() => (setAsking(false), router.refresh())} />}
    </div>
  );
}

function UnlockDialog({ request, onClose, onDone }: { request: (input: unknown) => Promise<ActionResult<null>>; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  return (
    <ResponsiveDialog open onClose={onClose} title="Ask to unlock" description="An admin sees your reason and can reopen the sheet.">
      <div className="grid gap-4">
        <TextAreaField label="What needs changing?" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} error={error} />
        <Button
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await request({ reason });
              if (!result.ok) return setError(result.fieldErrors?.reason?.[0] ?? result.error);
              toast("Request sent");
              onDone();
            })
          }
        >
          Send the request
        </Button>
      </div>
    </ResponsiveDialog>
  );
}
