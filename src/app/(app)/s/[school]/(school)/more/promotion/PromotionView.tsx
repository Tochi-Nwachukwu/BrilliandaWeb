"use client";

import { DECISION_LABEL, DECISIONS, type Decision } from "@brillianda/core/promotion";
import { Alert } from "@brillianda/ui/Alert";
import { Badge } from "@brillianda/ui/Badge";
import { Button } from "@brillianda/ui/Button";
import { Card } from "@brillianda/ui/Cards";
import { EmptyState } from "@brillianda/ui/EmptyState";
import { ResponsiveDialog } from "@brillianda/ui/ResponsiveDialog";
import { SelectField, TextField } from "@brillianda/ui/TextField";
import { toast } from "@brillianda/ui/Toast";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormError } from "@/components/auth/FormError";
import type { ActionResult, PromotionPlan } from "@/data/types";


export function PromotionView({
  plan,
  setPassMark,
  setDecision,
  complete,
}: {
  plan: PromotionPlan;
  setPassMark: (input: unknown) => Promise<ActionResult<null>>;
  setDecision: (studentId: string, input: unknown) => Promise<ActionResult<null>>;
  complete: (input: unknown) => Promise<ActionResult<{ promoted: number; repeating: number; graduated: number; session: string }>>;
}) {
  const router = useRouter();
  const [passMark, setMark] = useState(String(plan.passMark));
  const [pending, startTransition] = useTransition();
  const [decisions, setDecisions] = useState(() => Object.fromEntries(plan.classes.flatMap((c) => c.students.map((s) => [s.id, { decision: s.decision, reason: s.reason ?? "" }]))));
  const [completing, setCompleting] = useState(false);
  const counts = { promote: 0, repeat: 0, graduate: 0 } as Record<Decision, number>;
  for (const d of Object.values(decisions)) counts[d.decision]++;

  const decide = (studentId: string, decision: Decision, reason: string) => {
    setDecisions((all) => ({ ...all, [studentId]: { decision, reason } }));
    void setDecision(studentId, { decision, reason: reason || null }).then((r) => (r.ok ? undefined : toast(r.error)));
  };

  return (
    <div className="grid gap-4">
      {!plan.open && <Alert tone="info">Promotion completes in {plan.lastTerm}, the session’s last term. You can look over the suggestions and change them now.</Alert>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card title="Pass mark" description="At or above it, a student is suggested to move up; below it, to repeat.">
          <form
            className="flex items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const result = await setPassMark({ passMark });
                toast(result.ok ? "Pass mark saved" : result.error);
                if (result.ok) router.refresh();
              });
            }}
          >
            <TextField label="Yearly average needed" inputMode="decimal" value={passMark} onChange={(e) => setMark(e.target.value)} className="max-w-[10rem]" />
            <Button type="submit" variant="secondary" loading={pending} className="mb-[2px]">
              Save
            </Button>
          </form>
        </Card>
        <Card title="Decisions">
          <dl className="grid grid-cols-3 gap-3 text-center">
            {DECISIONS.map((d) => (
              <div key={d} className="rounded-2xl bg-sunken p-3">
                <dt className="text-[12.5px] text-text-secondary">{DECISION_LABEL[d]}</dt>
                <dd className="text-[24px] font-medium tabular-nums">{counts[d]}</dd>
              </div>
            ))}
          </dl>
          {plan.open && (
            <Button className="mt-4" onClick={() => setCompleting(true)}>
              Complete promotion
            </Button>
          )}
        </Card>
      </div>

      {plan.classes.length === 0 ? (
        <div className="rounded-3xl bg-surface p-6 shadow-raised">
          <EmptyState title="No students yet">Students show here, by class, once they’re added.</EmptyState>
        </div>
      ) : (
        plan.classes.map((c) => (
          <section key={c.armId} aria-labelledby={`p-${c.armId}`} className="rounded-3xl bg-surface p-5 shadow-raised sm:p-6">
            <h2 id={`p-${c.armId}`} className="mb-3 flex flex-wrap items-center gap-2 text-[17px] font-semibold tracking-[-0.02em]">
              {c.label}
              {c.finalClass && <Badge tone="info">Final class</Badge>}
            </h2>
            <ol className="grid gap-1">
              {c.students.map((s) => {
                const d = decisions[s.id]!;
                const changed = d.decision !== s.suggested;
                return (
                  <li key={s.id} className="grid gap-2 rounded-2xl p-2.5 sm:grid-cols-[minmax(0,1fr)_7rem_11rem] sm:items-center">
                    <span className="min-w-0">
                      <b className="block truncate font-semibold">{s.fullName}</b>
                      <span className="text-[12.5px] text-text-secondary">
                        {s.admissionNo} · suggested: {DECISION_LABEL[s.suggested].toLowerCase()}
                      </span>
                    </span>
                    <span className="text-sm tabular-nums">
                      {s.yearlyAverage ?? "No results"}
                      {s.yearlyAverage !== null && <span className="block text-[12px] text-text-secondary">{s.termsCounted === 1 ? "1 term" : `${s.termsCounted} terms`}</span>}
                    </span>
                    <SelectField label={`Decision for ${s.fullName}`} value={d.decision} onChange={(e) => decide(s.id, e.target.value as Decision, d.reason)} className="[&>label]:sr-only">
                      {DECISIONS.filter((x) => (c.finalClass ? x !== "promote" : x !== "graduate") || x === s.suggested).map((x) => (
                        <option key={x} value={x}>
                          {DECISION_LABEL[x]}
                        </option>
                      ))}
                    </SelectField>
                    {changed && (
                      <TextField
                        label={`Why, for ${s.fullName}?`}
                        defaultValue={d.reason}
                        placeholder="Optional reason"
                        className="sm:col-span-3"
                        onBlur={(e) => {
                          if (e.target.value !== d.reason) decide(s.id, d.decision, e.target.value);
                        }}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))
      )}

      {completing && <CompleteDialog plan={plan} counts={counts} complete={complete} onClose={() => setCompleting(false)} />}
    </div>
  );
}

function CompleteDialog({
  plan,
  counts,
  complete,
  onClose,
}: {
  plan: PromotionPlan;
  counts: Record<Decision, number>;
  complete: (input: unknown) => Promise<ActionResult<{ promoted: number; repeating: number; graduated: number; session: string }>>;
  onClose: () => void;
}) {
  const router = useRouter();
  const [startsOn, setStartsOn] = useState(plan.firstTerm.startsOn);
  const [endsOn, setEndsOn] = useState(plan.firstTerm.endsOn);
  const [anyway, setAnyway] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <ResponsiveDialog open onClose={onClose} title={`Start ${plan.nextSessionName}?`} description={`${counts.promote} move up, ${counts.repeat} repeat, ${counts.graduate} graduate. ${plan.lastTerm} closes and its scores lock.`}>
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label={`${plan.firstTerm.name} starts`} type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
          <TextField label={`${plan.firstTerm.name} ends`} type="date" value={endsOn} min={startsOn} onChange={(e) => setEndsOn(e.target.value)} />
        </div>
        {plan.unpublished.length > 0 && (
          <label className="flex items-start gap-3 rounded-2xl bg-warning-bg p-3 text-sm">
            <input type="checkbox" checked={anyway} onChange={(e) => setAnyway(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]" />
            <span>
              Complete anyway. Not published: {plan.unpublished.map((u) => u.label).join(", ")}; those parents won’t see {plan.lastTerm}’s results.
            </span>
          </label>
        )}
        <FormError message={failure} />
        <Button
          loading={pending}
          disabled={plan.unpublished.length > 0 && !anyway}
          onClick={() =>
            startTransition(async () => {
              const result = await complete({ closeUnpublished: anyway, startsOn, endsOn });
              if (!result.ok) return setFailure(result.error);
              toast(`${result.data.session} has begun: ${result.data.promoted} moved up, ${result.data.repeating} repeating, ${result.data.graduated} graduated`);
              onClose();
              router.refresh();
            })
          }
        >
          Complete promotion
        </Button>
      </div>
    </ResponsiveDialog>
  );
}
