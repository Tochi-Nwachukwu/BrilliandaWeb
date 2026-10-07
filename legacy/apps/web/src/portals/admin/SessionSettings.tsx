import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { SessionInfo, SessionTerm } from "@brillanda/shared-types";
import { fieldError, generalError } from "../../shared/auth/LoginPage";
import { Alert } from "../../shared/components/Alert";
import { Badge } from "../../shared/components/Badge";
import { Button } from "../../shared/components/Button";
import { Card } from "../../shared/components/Cards";
import { Dialog } from "../../shared/components/Overlay";
import { PageSpinner } from "../../shared/components/Spinner";
import { TextField } from "../../shared/components/TextField";
import { toast } from "../../shared/components/Toast";
import { cx } from "../../shared/utils/cx";
import { formatDate, plural } from "../../shared/utils/time";
import { useCloseTerm, useSession } from "./api";

// The school year (DECISIONS.md F-43): the session's three terms at a glance, and closing the
// current term to start the next. The last term closes with promotion (F-44).

const DAY = 86_400_000;
const isoIn = (days: number) => new Date(Date.now() + days * DAY).toISOString().slice(0, 10);

/** Session, terms and the close-term step, above the current term's dates. */
export function SessionSection({ children }: { children: React.ReactNode }) {
  const session = useSession();
  if (session.isPending) return <PageSpinner />;
  if (session.error) return <Alert tone="danger">{session.error.message}</Alert>;
  const s = session.data;
  const current = s.terms.find((t) => t.status === "CURRENT");
  return (
    <div className="grid gap-4">
      <Timeline session={s} />
      {children}
      {current && <CloseTerm session={s} current={current} />}
    </div>
  );
}

function Timeline({ session }: { session: SessionInfo }) {
  return (
    <Card title={`${session.name} session`} description="Three terms. One is open at a time.">
      <ol className="grid gap-2 sm:grid-cols-3">
        {session.terms.map((t, i) => (
          <li key={t.id} className={cx("grid gap-1.5 rounded-2xl p-3.5", t.status === "CURRENT" ? "bg-accent-soft" : "bg-sunken")} aria-current={t.status === "CURRENT" ? "step" : undefined}>
            <span className="flex items-center justify-between gap-2">
              <b className="text-[15px] font-semibold">{t.name}</b>
              <Badge tone={t.status === "CURRENT" ? "info" : t.status === "CLOSED" ? "success" : "neutral"}>
                {t.status === "CURRENT" ? "Now" : t.status === "CLOSED" ? "Closed" : `Term ${i + 1}`}
              </Badge>
            </span>
            <span className="text-[13px] text-text-secondary">
              {t.status === "CLOSED" && t.closedOn
                ? `Closed ${formatDate(t.closedOn)}`
                : t.startsOn && t.endsOn
                  ? `${formatDate(t.startsOn)} to ${formatDate(t.endsOn)}`
                  : "Dates set when it starts"}
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function CloseTerm({ session, current }: { session: SessionInfo; current: SessionTerm }) {
  const [open, setOpen] = useState(false);
  const index = session.terms.indexOf(current);
  const next = session.terms[index + 1];
  const unpublished = session.unpublishedArms;

  if (!next) {
    return (
      <Card title={`At the end of ${current.name}`} description="The session closes with promotion.">
        <p className="text-sm text-text-secondary">Once this term's results are in, review who moves up, who repeats and who graduates. Closing the session moves everyone at once and starts the next one.</p>
        <Link to="/admin/session/promotion" className="mt-4 inline-flex min-h-[42px] items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Review promotion</Link>
      </Card>
    );
  }

  return (
    <Card title={`Close ${current.name} and start ${next.name}`} description="Do this when the term's results are out.">
      <ul className="grid gap-2 text-sm">
        <li className="flex gap-2.5"><Dot />Every score this term is locked for good.</li>
        <li className="flex gap-2.5"><Dot />Results stay on each student's page, and with parents where they were published.</li>
        <li className="flex gap-2.5"><Dot />{next.name} starts with empty score sheets, for the same classes and teachers.</li>
      </ul>
      <div className="mt-4">
        {unpublished.length ? (
          <Alert tone="warning">
            {plural(unpublished.length, "class hasn't", "classes haven't")} been published: {unpublished.slice(0, 6).map((a) => a.name).join(", ")}
            {unpublished.length > 6 ? ` and ${unpublished.length - 6} more` : ""}. <Link to="/admin/publishing" className="font-medium underline">Go to publishing</Link>
          </Alert>
        ) : (
          <Alert tone="success">Every class has been published.</Alert>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button onClick={() => setOpen(true)}>Close {current.name}</Button>
        <Link to="/admin/session/promotion" className="text-sm font-medium text-accent hover:underline">Preview end-of-year promotion</Link>
      </div>
      {open && <CloseTermDialog current={current} next={next} unpublished={unpublished} onClose={() => setOpen(false)} />}
    </Card>
  );
}

const Dot = () => <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />;

function CloseTermDialog({ current, next, unpublished, onClose }: { current: SessionTerm; next: SessionTerm; unpublished: SessionInfo["unpublishedArms"]; onClose: () => void }) {
  const close = useCloseTerm();
  // Most schools start the next term about three weeks after the last one ends.
  const [dates, setDates] = useState({ startsOn: isoIn(21), endsOn: isoIn(21 + 84), scoresDueOn: isoIn(21 + 77), nextTermBegins: "" });
  const [anyway, setAnyway] = useState(false);
  const field = (key: keyof typeof dates, label: string, hint?: string) => (
    <TextField label={label} type="date" value={dates[key]} onChange={(e) => setDates((d) => ({ ...d, [key]: e.target.value }))} error={fieldError(close.error, key)} hint={hint} />
  );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    close.mutate(
      { next: { ...dates, nextTermBegins: dates.nextTermBegins || null }, closeUnpublished: anyway },
      { onSuccess: (r) => { toast(`${r.closed.name} is closed. ${r.started.name} has started`); onClose(); } },
    );
  };
  return (
    <Dialog open onClose={onClose} width={560} title={`Close ${current.name}`} description={`Then ${next.name} starts. Closing can't be undone.`}>
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <p className="text-sm font-semibold">{next.name} dates</p>
        <div className="grid gap-4 sm:grid-cols-2">{field("startsOn", "Starts")}{field("endsOn", "Ends")}</div>
        {field("scoresDueOn", "Scores due", "Teachers see this on their home screen.")}
        {field("nextTermBegins", "Following term begins (optional)", "Printed at the bottom of report cards.")}
        {unpublished.length > 0 && (
          <label className="flex cursor-pointer items-start gap-2.5 rounded-2xl bg-warning-bg p-3.5 text-sm">
            <input type="checkbox" className="mt-0.5 h-[18px] w-[18px] accent-[var(--color-accent)]" checked={anyway} onChange={(e) => setAnyway(e.target.checked)} />
            <span>
              Close anyway. {plural(unpublished.length, "class", "classes")} stay unpublished, so {unpublished.length === 1 ? "its" : "their"} parents won't see {current.name} results.
            </span>
          </label>
        )}
        {generalError(close.error) && <Alert tone="danger">{generalError(close.error)}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={unpublished.length > 0 && !anyway} loading={close.isPending}>Close {current.name}</Button>
        </div>
      </form>
    </Dialog>
  );
}
