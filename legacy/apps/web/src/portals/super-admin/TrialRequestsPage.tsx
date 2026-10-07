import { useState, type FormEvent } from "react";
import type { TrialRequest, TrialRequestStatus } from "@brillanda/shared-types";
import { fieldError, generalError } from "../../shared/auth/LoginPage";
import { Alert } from "../../shared/components/Alert";
import { Badge } from "../../shared/components/Badge";
import { Button } from "../../shared/components/Button";
import { EmptyState } from "../../shared/components/EmptyState";
import { Icon } from "../../shared/components/Icon";
import { Dialog } from "../../shared/components/Overlay";
import { PageHeader } from "../../shared/components/PageHeader";
import { PageSpinner } from "../../shared/components/Spinner";
import { FilterTabs } from "../../shared/components/Tabs";
import { TextField } from "../../shared/components/TextField";
import { toast } from "../../shared/components/Toast";
import { levelStyle } from "../../shared/theme/levels";
import { formatDateTime, timeAgo } from "../../shared/utils/time";
import { useBookCall, useDeclineTrial, useTrialRequests } from "./api";
import { initialsOf } from "./OverviewPage";
import { CreateSchoolDialog } from "./schools";

type Tab = "NEW" | "CALL_BOOKED" | "DONE";
const inTab = (tab: Tab, status: TrialRequestStatus) =>
  tab === "DONE" ? status === "SCHOOL_CREATED" || status === "DECLINED" : status === tab;

export function TrialRequestsPage() {
  const trials = useTrialRequests();
  const [tab, setTab] = useState<Tab>("NEW");
  const [creating, setCreating] = useState<TrialRequest | null>(null);
  const [booking, setBooking] = useState<TrialRequest | null>(null);
  const [declining, setDeclining] = useState<TrialRequest | null>(null);

  if (trials.isPending) return <PageSpinner />;
  if (trials.error) return <Alert tone="danger">{trials.error.message}</Alert>;

  const all = [...trials.data].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const tabs = [
    { value: "NEW" as const, label: "New", count: all.filter((t) => inTab("NEW", t.status)).length },
    { value: "CALL_BOOKED" as const, label: "Call booked", count: all.filter((t) => inTab("CALL_BOOKED", t.status)).length },
    { value: "DONE" as const, label: "Done", count: all.filter((t) => inTab("DONE", t.status)).length },
  ];
  const shown = all.filter((t) => inTab(tab, t.status));

  return (
    <>
      <PageHeader title="Trial requests">
        Schools that filled in “Request a trial” on the website. Nobody gets in until we create their school, so every
        request lands here first.
      </PageHeader>
      <div className="mb-5">
        <FilterTabs label="Show" items={tabs} value={tab} onChange={setTab} />
      </div>

      {shown.length ? (
        <ul className="grid gap-3.5">
          {shown.map((trial, index) => (
            <li key={trial.id}>
              <TrialCard trial={trial} index={index} onCreate={setCreating} onBook={setBooking} onDecline={setDeclining} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={tab === "DONE" ? "Nothing here yet" : "No requests waiting"}>
          {tab === "DONE" ? "Requests you turn into schools or decline appear here." : "New requests from the website appear here straight away."}
        </EmptyState>
      )}

      <CreateSchoolDialog open={!!creating} from={creating} onClose={() => setCreating(null)} />
      <BookCallDialog trial={booking} onClose={() => setBooking(null)} />
      <DeclineDialog trial={declining} onClose={() => setDeclining(null)} />
    </>
  );
}

function TrialCard({
  trial,
  index,
  onCreate,
  onBook,
  onDecline,
}: {
  trial: TrialRequest;
  index: number;
  onCreate: (t: TrialRequest) => void;
  onBook: (t: TrialRequest) => void;
  onDecline: (t: TrialRequest) => void;
}) {
  const open = trial.status === "NEW" || trial.status === "CALL_BOOKED";
  return (
    <article className="grid animate-pop gap-4 rounded-[26px] bg-surface p-[22px] shadow-raised" style={{ ["--d" as string]: `${index * 0.05}s` }}>
      <div className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-x-3.5 gap-y-2 sm:grid-cols-[48px_minmax(0,1fr)_auto]">
        <span aria-hidden className="grid h-12 w-12 place-items-center rounded-2xl text-[15px] font-semibold" style={{ ...levelStyle(index + 2), background: "var(--tint)", color: "var(--deep)" }}>
          {initialsOf(trial.schoolName)}
        </span>
        <div className="min-w-0">
          <h2 className="text-[21px] font-medium tracking-[-0.025em]">{trial.schoolName}</h2>
          <p className="text-[13.5px] text-text-secondary">
            {trial.city}. {trial.studentEstimate ? `About ${trial.studentEstimate} students. ` : ""}Asked {timeAgo(trial.createdAt).toLowerCase()}.
          </p>
        </div>
        <div className="col-span-2 sm:col-span-1">
          {trial.status === "NEW" && <Badge tone="info">New</Badge>}
          {trial.status === "CALL_BOOKED" && trial.callAt && <Badge tone="warning">Call: {formatDateTime(trial.callAt)}</Badge>}
          {trial.status === "SCHOOL_CREATED" && <Badge tone="success">School created</Badge>}
          {trial.status === "DECLINED" && <Badge>Declined</Badge>}
        </div>
      </div>

      {trial.message && <blockquote className="m-0 rounded-[18px] bg-sunken px-4 py-3.5 text-[15.5px] leading-relaxed">“{trial.message}”</blockquote>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          <b className="font-semibold">{trial.contactName}</b>
          {trial.contactRole ? `, ${trial.contactRole.toLowerCase()}` : ""}
          <span className="block text-[12.5px] text-text-secondary">
            {trial.email}
            {trial.phone ? `. ${trial.phone}` : ""}
          </span>
        </p>
        {open && (
          <div className="flex flex-wrap gap-1.5">
            {trial.status === "NEW" && (
              <Button size="sm" variant="secondary" onClick={() => onBook(trial)}>
                Book a call
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => onDecline(trial)}>
              Decline
            </Button>
            <Button size="sm" onClick={() => onCreate(trial)}>
              <Icon name="plus" className="h-4 w-4" />
              Create school
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

/** Two days ahead at 11:00, the usual slot. */
function defaultCallTime() {
  const date = new Date(Date.now() + 2 * 86_400_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return { day: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`, time: "11:00" };
}

function BookCallDialog({ trial, onClose }: { trial: TrialRequest | null; onClose: () => void }) {
  const [when, setWhen] = useState(defaultCallTime);
  const book = useBookCall();
  if (!trial) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const at = new Date(`${when.day}T${when.time}`);
    book.mutate(
      { id: trial.id, callAt: Number.isNaN(at.getTime()) ? "" : at.toISOString() },
      {
        onSuccess: () => {
          toast(`Call booked with ${trial.contactName}`);
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open onClose={onClose} title={`Book a call with ${trial.contactName}`} description={`${trial.schoolName}. They'll get a calendar invite at ${trial.email}.`}>
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Day" type="date" value={when.day} onChange={(e) => setWhen((w) => ({ ...w, day: e.target.value }))} data-autofocus />
          <TextField label="Time" type="time" value={when.time} onChange={(e) => setWhen((w) => ({ ...w, time: e.target.value }))} error={fieldError(book.error, "callAt")} />
        </div>
        {generalError(book.error) && <Alert tone="danger">{generalError(book.error)}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={book.isPending}>
            Book the call
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function DeclineDialog({ trial, onClose }: { trial: TrialRequest | null; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const decline = useDeclineTrial();
  if (!trial) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    decline.mutate(
      { id: trial.id, reason },
      {
        onSuccess: () => {
          toast(`Declined. We've emailed ${trial.contactName}`);
          setReason("");
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open onClose={onClose} title={`Decline ${trial.schoolName}?`} description="We'll email them a polite note. You can say why.">
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <label className="grid gap-1.5 text-sm font-medium">
          Reason (optional)
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            data-autofocus
            rows={3}
            placeholder="For example: primary schools aren't supported yet."
            className="rounded-[14px] border-0 bg-sunken px-4 py-3 text-base font-normal placeholder:text-text-muted focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        {decline.error && <Alert tone="danger">{generalError(decline.error)}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Keep it
          </Button>
          <Button type="submit" loading={decline.isPending}>
            Decline
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
