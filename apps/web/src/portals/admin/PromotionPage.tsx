import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { CompletePromotionResponse, PromotionDecision, PromotionPlan, PromotionStudent } from "@brillanda/shared-types";
import { fieldError, generalError } from "../../shared/auth/LoginPage";
import { Alert } from "../../shared/components/Alert";
import { Badge } from "../../shared/components/Badge";
import { Button } from "../../shared/components/Button";
import { Card } from "../../shared/components/Cards";
import { EmptyState } from "../../shared/components/EmptyState";
import { Icon } from "../../shared/components/Icon";
import { Dialog } from "../../shared/components/Overlay";
import { PageHeader } from "../../shared/components/PageHeader";
import { PageSpinner } from "../../shared/components/Spinner";
import { FilterTabs } from "../../shared/components/Tabs";
import { TextField } from "../../shared/components/TextField";
import { levelStyle } from "../../shared/theme/levels";
import { cx } from "../../shared/utils/cx";
import { plural } from "../../shared/utils/time";
import { useChangePromotion, useCompletePromotion, usePromotion, useSetPassMark } from "./api";

// Promotion at the end of a session (DECISIONS.md F-44): each student's yearly average, the
// decision it suggests (move up, repeat, graduate), any change made by hand, and closing the
// session so everyone moves at once.

type Filter = "ALL" | "REPEAT" | "CHANGED";
const DAY = 86_400_000;
const isoIn = (days: number) => new Date(Date.now() + days * DAY).toISOString().slice(0, 10);
const LABEL: Record<PromotionDecision, string> = { PROMOTE: "Move up", REPEAT: "Repeat", GRADUATE: "Graduate" };

export function PromotionPage() {
  const plan = usePromotion();
  const [done, setDone] = useState<CompletePromotionResponse | null>(null);

  if (done) return <Finished outcome={done} />;
  if (plan.isPending) return <PageSpinner />;
  if (plan.error) return <Alert tone="danger">{plan.error.message}</Alert>;
  const p = plan.data;

  return (
    <>
      <Link to="/admin/settings?tab=term" className="-ml-1 mb-2 inline-flex items-center gap-1 rounded-md px-1 text-sm text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <Icon name="chevron" className="h-4 w-4 rotate-180" />
        Session
      </Link>
      <PageHeader title="Promotion">
        Who moves up, who repeats and who graduates at the end of {p.sessionName}. Brillanda suggests each one from the yearly average; change any of them.
      </PageHeader>
      {!p.open && (
        <div className="mb-5">
          <Alert tone="info">This is a preview. You can close the session once the Third Term is under way, after its results are in.</Alert>
        </div>
      )}
      <div className="mb-5 grid grid-cols-3 gap-3.5">
        <Tile level={0} value={p.counts.PROMOTE} label="move up" />
        <Tile level={5} value={p.counts.REPEAT} label="repeat" />
        <Tile level={2} value={p.counts.GRADUATE} label="graduate" />
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <Classes plan={p} />
        <div className="grid gap-4 lg:sticky lg:top-6">
          <PassMark plan={p} />
          <CloseSession plan={p} onDone={setDone} />
        </div>
      </div>
    </>
  );
}

function Tile({ level, value, label }: { level: number; value: number; label: string }) {
  return (
    <div className="grid gap-1 rounded-[22px] p-[18px]" style={{ ...levelStyle(level), background: "var(--tint)", color: "var(--deep)" }}>
      <span className="text-[30px] font-medium leading-none tracking-[-0.03em] tabular-nums">{value}</span>
      <span className="text-sm opacity-85">{label}</span>
    </div>
  );
}

function PassMark({ plan }: { plan: PromotionPlan }) {
  const [value, setValue] = useState(String(plan.passMark));
  const save = useSetPassMark();
  const number = Number(value);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate(number);
  };
  return (
    <Card title="The rule" description="Final-year students graduate. Everyone else moves up when their yearly average reaches the pass mark.">
      <form onSubmit={submit} className="grid gap-3" noValidate>
        <TextField label="Pass mark" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ""))} error={fieldError(save.error, "passMark")} hint="The yearly average is the average of the session's term averages." />
        <div><Button type="submit" size="sm" variant="secondary" disabled={!value || number === plan.passMark} loading={save.isPending}>Apply</Button></div>
      </form>
    </Card>
  );
}

function Classes({ plan }: { plan: PromotionPlan }) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const changed = plan.classes.flatMap((c) => c.students).filter((s) => s.decision !== s.suggested || s.reason).length;
  const keep = (s: PromotionStudent) => filter === "ALL" || (filter === "REPEAT" ? s.decision === "REPEAT" : s.decision !== s.suggested || !!s.reason);
  const classes = plan.classes.map((c) => ({ ...c, shown: c.students.filter(keep) })).filter((c) => c.shown.length);
  const filtering = filter !== "ALL";

  if (!plan.classes.length) return <EmptyState title="No students yet">Promotion lists every current student once they're enrolled.</EmptyState>;

  return (
    <div className="grid min-w-0 gap-3">
      <FilterTabs label="Show" value={filter} onChange={setFilter} items={[{ value: "ALL", label: "All" }, { value: "REPEAT", label: "Repeating", count: plan.counts.REPEAT }, { value: "CHANGED", label: "Changed by hand", count: changed }]} />
      {!classes.length && <EmptyState title="Nobody here">{filter === "REPEAT" ? "Everyone moves up or graduates." : "No decisions have been changed."}</EmptyState>}
      {classes.map((c) => {
        const isOpen = filtering || open.has(c.armId);
        const repeat = c.students.filter((s) => s.decision === "REPEAT").length;
        return (
          <section key={c.armId} className={cx("overflow-hidden rounded-[22px] bg-surface", isOpen ? "shadow-float" : "shadow-raised")} style={levelStyle(c.classOrder)} aria-label={c.armName}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpen((prev) => { const next = new Set(prev); if (next.has(c.armId)) next.delete(c.armId); else next.add(c.armId); return next; })}
              className="grid w-full grid-cols-[46px_minmax(0,1fr)_34px] items-center gap-3.5 px-4 py-3.5 text-left hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
            >
              <span aria-hidden className="grid h-[46px] w-[46px] place-items-center rounded-[15px] text-sm font-semibold" style={{ background: "var(--tint)", color: "var(--deep)" }}>{c.armName.replace(/^\s*(JSS|SS)\s*/i, "")}</span>
              <span className="min-w-0">
                <b className="block text-[15.5px] font-semibold">{c.armName}</b>
                <span className="text-[13px] text-text-secondary">
                  {c.students[0]!.suggested === "GRADUATE" || c.students[0]!.decision === "GRADUATE" ? `${c.students.length - repeat} graduate` : `${c.students.length - repeat} move up to ${c.students.find((s) => s.decision === "PROMOTE")?.destination ?? "the next class"}`}
                  {repeat ? `, ${repeat} repeat` : ""}
                </span>
              </span>
              <span aria-hidden className={cx("grid h-[34px] w-[34px] place-items-center rounded-full", isOpen ? "bg-primary text-primary-text" : "bg-sunken")}>
                <Icon name="chevron" className={cx("h-4 w-4 transition-transform duration-300", isOpen && "rotate-90")} />
              </span>
            </button>
            {isOpen && (
              <ul className="grid gap-0.5 border-t border-divider p-2">
                {c.shown.map((s) => <StudentRow key={s.id} student={s} final={s.suggested === "GRADUATE"} />)}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

function StudentRow({ student: s, final }: { student: PromotionStudent; final: boolean }) {
  const change = useChangePromotion();
  const [reason, setReason] = useState(s.reason ?? "");
  const isChanged = s.decision !== s.suggested || !!s.reason;
  const options: PromotionDecision[] = final ? ["GRADUATE", "REPEAT"] : ["PROMOTE", "REPEAT"];
  const describe = (d: PromotionDecision) => (d === "PROMOTE" ? `Move up${s.destination && s.decision === "PROMOTE" ? ` to ${s.destination}` : ""}` : LABEL[d]);

  return (
    <li className={cx("grid gap-2 rounded-2xl p-2.5 sm:grid-cols-[minmax(0,1fr)_6rem_13rem] sm:items-center", isChanged && "bg-accent-soft")}>
      <span className="min-w-0">
        <Link to={`/admin/students/${encodeURIComponent(s.id)}`} className="block truncate font-medium hover:underline">{s.fullName}</Link>
        <span className="text-[12.5px] text-text-secondary">
          {s.admissionNo}
          {isChanged && <> · <Badge tone="info">Changed</Badge></>}
        </span>
      </span>
      <span className="text-sm tabular-nums sm:text-right">
        {s.yearlyAverage === null ? <span className="text-text-muted">No results</span> : <b className={cx("font-semibold", s.suggested === "REPEAT" && "text-danger")}>{s.yearlyAverage.toFixed(1)}</b>}
        <span className="block text-[11.5px] text-text-muted">{s.termsCounted ? plural(s.termsCounted, "term") : ""}</span>
      </span>
      <span className="grid gap-1.5">
        <select
          aria-label={`Decision for ${s.fullName}`}
          value={s.decision}
          disabled={change.isPending}
          onChange={(e) => change.mutate({ id: s.id, decision: e.target.value as PromotionDecision, reason: reason || null })}
          className={cx("min-h-[40px] rounded-xl border-0 px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-accent", s.decision === "REPEAT" ? "bg-danger-bg text-danger" : "bg-sunken")}
        >
          {options.map((d) => <option key={d} value={d}>{describe(d)}{d === s.suggested ? " (suggested)" : ""}</option>)}
        </select>
        {isChanged && (
          <input
            aria-label={`Why, for ${s.fullName}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            onBlur={() => reason !== (s.reason ?? "") && change.mutate({ id: s.id, decision: s.decision, reason: reason || null })}
            placeholder="Why? (optional)"
            className="min-h-[34px] rounded-lg border-0 bg-surface px-2.5 text-[13px] shadow-raised focus:outline-none focus:ring-2 focus:ring-accent"
          />
        )}
        {change.error && <span className="text-[12px] text-danger">{generalError(change.error) ?? fieldError(change.error, "decision")}</span>}
      </span>
    </li>
  );
}

function CloseSession({ plan, onDone }: { plan: PromotionPlan; onDone: (r: CompletePromotionResponse) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Card title={`Close ${plan.sessionName}`} description={`Everyone moves as decided, and ${plan.nextSessionName} starts.`}>
      {plan.unpublishedArms.length > 0 && (
        <p className="mb-3 text-[13px] text-text-secondary">
          {plural(plan.unpublishedArms.length, "class hasn't", "classes haven't")} published Third Term results. <Link className="font-medium text-accent hover:underline" to="/admin/publishing">Publishing</Link>
        </p>
      )}
      <Button className="w-full" disabled={!plan.open} onClick={() => setOpen(true)}>Close the session</Button>
      {open && <CloseSessionDialog plan={plan} onClose={() => setOpen(false)} onDone={onDone} />}
    </Card>
  );
}

function CloseSessionDialog({ plan, onClose, onDone }: { plan: PromotionPlan; onClose: () => void; onDone: (r: CompletePromotionResponse) => void }) {
  const complete = useCompletePromotion();
  const [dates, setDates] = useState({ startsOn: isoIn(42), endsOn: isoIn(42 + 84), scoresDueOn: isoIn(42 + 77), nextTermBegins: "" });
  const [anyway, setAnyway] = useState(false);
  const unpublished = plan.unpublishedArms.length;
  const field = (key: keyof typeof dates, label: string) => (
    <TextField label={label} type="date" value={dates[key]} onChange={(e) => setDates((d) => ({ ...d, [key]: e.target.value }))} error={fieldError(complete.error, key)} />
  );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    complete.mutate({ firstTerm: { ...dates, nextTermBegins: dates.nextTermBegins || null }, closeUnpublished: anyway }, { onSuccess: onDone });
  };
  return (
    <Dialog open onClose={onClose} width={560} title={`Close ${plan.sessionName}`} description="This can't be undone.">
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <ul className="grid gap-1.5 rounded-2xl bg-sunken p-3.5 text-sm">
          <li><b className="font-semibold tabular-nums">{plan.counts.PROMOTE}</b> move up a class</li>
          <li><b className="font-semibold tabular-nums">{plan.counts.REPEAT}</b> repeat their class</li>
          <li><b className="font-semibold tabular-nums">{plan.counts.GRADUATE}</b> graduate and leave the school</li>
        </ul>
        <p className="text-sm font-semibold">{plan.nextSessionName}, First Term dates</p>
        <div className="grid gap-4 sm:grid-cols-2">{field("startsOn", "Starts")}{field("endsOn", "Ends")}</div>
        {field("scoresDueOn", "Scores due")}
        {unpublished > 0 && (
          <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl bg-warning-bg p-3.5 text-sm">
            <input type="checkbox" className="mt-0.5 h-[18px] w-[18px] accent-[var(--color-accent)]" checked={anyway} onChange={(e) => setAnyway(e.target.checked)} />
            <span>Close anyway. {plural(unpublished, "class", "classes")} stay unpublished, so their parents won't see Third Term results.</span>
          </label>
        )}
        {generalError(complete.error) && <Alert tone="danger">{generalError(complete.error)}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={unpublished > 0 && !anyway} loading={complete.isPending}>Close {plan.sessionName}</Button>
        </div>
      </form>
    </Dialog>
  );
}

function Finished({ outcome }: { outcome: CompletePromotionResponse }) {
  return (
    <section className="grid animate-pop justify-items-center gap-3 rounded-3xl bg-surface px-6 py-14 text-center shadow-raised">
      <span aria-hidden className="grid h-16 w-16 place-items-center rounded-full bg-success-bg text-success"><Icon name="check" className="h-8 w-8" /></span>
      <h1 className="text-[28px] font-medium tracking-[-0.03em]">{outcome.sessionName} has started</h1>
      <p className="max-w-md text-text-secondary">
        {plural(outcome.promoted, "student")} moved up, {outcome.repeating} {outcome.repeating === 1 ? "is" : "are"} repeating, and {plural(outcome.graduated, "student")} graduated. New JSS 1 students can be enrolled now.
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Link to="/admin/students" className="inline-flex min-h-[42px] items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-text">See your students</Link>
        <Link to="/admin" className="inline-flex min-h-[42px] items-center rounded-full bg-raise px-5 text-sm font-medium shadow-raised">Go home</Link>
      </div>
    </section>
  );
}
