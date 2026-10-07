import { useState, type FormEvent } from "react";
import type { PlanTier, PlatformSchool, TrialRequest } from "@brillanda/shared-types";
import { fieldError, generalError } from "../../shared/auth/LoginPage";
import { Alert } from "../../shared/components/Alert";
import { Button } from "../../shared/components/Button";
import { Icon } from "../../shared/components/Icon";
import { Dialog, PanelTitle, SidePanel } from "../../shared/components/Overlay";
import { TextField } from "../../shared/components/TextField";
import { toast } from "../../shared/components/Toast";
import { levelStyle } from "../../shared/theme/levels";
import { daysUntil, formatDate, plural, timeAgo } from "../../shared/utils/time";
import { useChangePlan, useCreateSchool, useExtendTrial, useRestoreSchool, useSuspendSchool } from "./api";

/** How the team thinks about a school: active and paying, on a trial, or suspended. */
export type SchoolState = "ACTIVE" | "TRIAL" | "SUSPENDED";

export const schoolState = (s: PlatformSchool): SchoolState =>
  s.status === "SUSPENDED" ? "SUSPENDED" : s.planTier === "TRIAL" ? "TRIAL" : "ACTIVE";

export const STATE_LABEL: Record<SchoolState, string> = { ACTIVE: "Active", TRIAL: "On trial", SUSPENDED: "Suspended" };
/** Mint for active, butter for trials, rose for suspended: the level palette, reused for meaning. */
export const STATE_LEVEL: Record<SchoolState, number> = { ACTIVE: 0, TRIAL: 4, SUSPENDED: 5 };
const STATE_DOT: Record<SchoolState, string> = { ACTIVE: "bg-success", TRIAL: "bg-warning", SUSPENDED: "bg-danger" };
const PLAN_LABEL: Record<PlanTier, string> = { TRIAL: "Free trial", BASIC: "Basic", STANDARD: "Standard" };

export const scoresInLabel = (s: PlatformSchool) =>
  s.status === "SUSPENDED" || s.scoresInShare === null ? "—" : `${Math.round(s.scoresInShare * 100)}%`;

function trialLine(s: PlatformSchool): string | null {
  if (s.planTier !== "TRIAL" || !s.trialEndsAt) return null;
  const left = daysUntil(s.trialEndsAt);
  return left > 0 ? `${plural(left, "day")} left on the trial` : "Trial has ended";
}

const WAVE = "M0 10 Q25 0 50 10 T100 10 T150 10 T200 10 T250 10 T300 10 T350 10 T400 10 V20 H0Z";

/** A school as a card. The tint rises to the share of this term's scores already in. */
export function SchoolCard({ school, index, onOpen }: { school: PlatformSchool; index: number; onOpen: (id: string) => void }) {
  const state = schoolState(school);
  const share = state === "SUSPENDED" ? 0 : school.scoresInShare ?? 0;
  return (
    <button
      type="button"
      onClick={() => onOpen(school.id)}
      className="group relative isolate grid min-h-[200px] animate-pop content-start gap-4 overflow-hidden rounded-[26px] bg-surface p-[22px] text-left shadow-raised transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      style={{ ...levelStyle(STATE_LEVEL[state]), ["--d" as string]: `${index * 0.03}s` }}
    >
      <span className="relative z-10 flex items-center justify-between gap-2">
        <span className="truncate rounded-full px-2.5 py-1 text-[12.5px] font-semibold" style={{ background: "var(--tint)", color: "var(--deep)" }}>
          {school.city ?? "No city"}
        </span>
        <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-text-secondary">
          <span aria-hidden className={`h-[7px] w-[7px] rounded-full ${STATE_DOT[state]}`} />
          {STATE_LABEL[state]}
        </span>
      </span>
      <span className="relative z-10 text-2xl font-medium leading-tight tracking-[-0.03em]">{school.name}</span>
      <span className="relative z-10 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-[13px] text-text-secondary">
        <span aria-hidden className="relative block h-1.5 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--color-text-primary)_7%,transparent)]">
          <span className="absolute inset-y-0 left-0 animate-grow rounded-full" style={{ width: `${share * 100}%`, background: "var(--mid)" }} />
        </span>
        <span className="tabular-nums">{state === "SUSPENDED" ? "No access" : `${scoresInLabel(school)} in`}</span>
      </span>
      <span className="relative z-10 mt-auto flex items-center justify-between text-[13px] text-text-secondary">
        <span>
          {school.studentCount.toLocaleString("en-GB")} students. {state === "TRIAL" ? trialLine(school) : PLAN_LABEL[school.planTier]}
        </span>
        <span aria-hidden className="grid h-8 w-8 -translate-x-1.5 place-items-center rounded-full bg-raise text-text-primary opacity-0 shadow-raised transition-[opacity,transform] duration-300 group-hover:translate-x-0 group-hover:opacity-100">
          <Icon name="chevron" className="h-4 w-4" />
        </span>
      </span>
      <span aria-hidden className="liquid" style={{ ["--p" as string]: (0.08 + share * 0.44).toFixed(3) }}>
        <svg viewBox="0 0 400 20" preserveAspectRatio="none"><path d={WAVE} /></svg>
        <svg viewBox="0 0 400 20" preserveAspectRatio="none"><path d={WAVE} /></svg>
      </span>
    </button>
  );
}

/** Everything about one school, and what the team can do to it. */
export function SchoolPanel({ school, onClose }: { school: PlatformSchool | null; onClose: () => void }) {
  const [suspending, setSuspending] = useState(false);
  const restore = useRestoreSchool();
  const extend = useExtendTrial();
  const plan = useChangePlan();
  if (!school) return null;
  const state = schoolState(school);
  const level = levelStyle(STATE_LEVEL[state]);
  const busy = restore.isPending || extend.isPending || plan.isPending;

  const rows: [string, string][] = [
    ["Status", STATE_LABEL[state]],
    ["Plan", PLAN_LABEL[school.planTier]],
    ...(school.trialEndsAt ? [["Trial ends", `${formatDate(school.trialEndsAt)}, ${Math.max(0, daysUntil(school.trialEndsAt))} days left`] as [string, string]] : []),
    ["Students", `${school.studentCount.toLocaleString("en-GB")} of ${school.studentLimit.toLocaleString("en-GB")} allowed`],
    ["Scores in this term", scoresInLabel(school)],
    ["Last active", timeAgo(school.lastActiveAt)],
  ];

  return (
    <>
      <SidePanel open onClose={onClose} label={school.name}>
        <PanelTitle icon="school" title={school.name} tint={{ bg: level["--tint"], fg: level["--deep"] }}>
          {school.city ?? "No city"}. On Brillanda since {formatDate(school.createdAt)}.
        </PanelTitle>
        {state === "SUSPENDED" && (
          <Alert tone="danger">
            <b className="font-semibold">Suspended.</b> {school.suspendedReason} Staff and parents can't sign in.
          </Alert>
        )}
        <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2.5 rounded-3xl bg-surface p-5 text-sm shadow-raised">
          {rows.map(([term, value]) => (
            <div key={term} className="contents">
              <dt className="text-text-secondary">{term}</dt>
              <dd className="m-0 text-right font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        {school.admin && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2.5 rounded-3xl bg-surface p-5 text-sm shadow-raised">
            <dt className="text-text-secondary">School admin</dt>
            <dd className="m-0 text-right font-medium">{school.admin.fullName}</dd>
            <dt className="text-text-secondary">Email</dt>
            <dd className="m-0 break-all text-right font-medium">{school.admin.email}</dd>
          </dl>
        )}
        <div className="mt-auto grid gap-2">
          {state === "SUSPENDED" ? (
            <Button
              loading={restore.isPending}
              onClick={() => restore.mutate(school.id, { onSuccess: () => toast(`${school.name} can sign in again`) })}
            >
              Restore access
            </Button>
          ) : (
            <>
              {state === "TRIAL" && (
                <>
                  <Button
                    loading={plan.isPending}
                    disabled={busy}
                    onClick={() => plan.mutate({ id: school.id, planTier: "STANDARD" }, { onSuccess: () => toast(`${school.name} is now on the Standard plan`) })}
                  >
                    Move to a paid plan
                  </Button>
                  <Button
                    variant="secondary"
                    loading={extend.isPending}
                    disabled={busy}
                    onClick={() => extend.mutate({ id: school.id, days: 14 }, { onSuccess: () => toast("Trial extended by 14 days") })}
                  >
                    Extend the trial by 14 days
                  </Button>
                </>
              )}
              <Button variant="danger-quiet" disabled={busy} onClick={() => setSuspending(true)}>
                <Icon name="lock" className="h-4 w-4" />
                Suspend this school
              </Button>
            </>
          )}
          {(restore.error || extend.error || plan.error) && <Alert tone="danger">{generalError(restore.error ?? extend.error ?? plan.error)}</Alert>}
        </div>
      </SidePanel>
      <SuspendDialog school={suspending ? school : null} onClose={() => setSuspending(false)} />
    </>
  );
}

const SUSPEND_REASONS = ["Payment is overdue.", "The school asked us to.", "We're looking into a security concern."];

/** Suspending signs everyone at a school out, so it asks for the school's name to be typed first. */
function SuspendDialog({ school, onClose }: { school: PlatformSchool | null; onClose: () => void }) {
  const [reason, setReason] = useState(SUSPEND_REASONS[0]!);
  const [typed, setTyped] = useState("");
  const suspend = useSuspendSchool();
  if (!school) return null;
  const matches = typed.trim().toLowerCase() === school.name.toLowerCase();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!matches) return;
    suspend.mutate(
      { id: school.id, reason },
      {
        onSuccess: () => {
          toast(`${school.name} is suspended. Everyone there has been signed out`);
          setTyped("");
          onClose();
        },
      },
    );
  };

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Suspend ${school.name}?`}
      description="Everyone at the school is signed out straight away, including anyone using it right now. Their data stays safe, and you can restore access at any time."
    >
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <label className="grid gap-1.5 text-sm font-medium">
          Why?
          <select
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="min-h-[46px] rounded-[14px] border-0 bg-sunken px-4 text-base font-normal focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
          >
            {SUSPEND_REASONS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </label>
        <TextField
          label="Type the school's name to confirm"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder={school.name}
          autoComplete="off"
          data-autofocus
          hint={typed && !matches ? `Type ${school.name} exactly, so nobody suspends a school by accident.` : undefined}
        />
        {suspend.error && <Alert tone="danger">{generalError(suspend.error)}</Alert>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={!matches} loading={suspend.isPending}>
            <Icon name="lock" className="h-4 w-4" />
            Suspend school
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/** Creates a school and invites its admin, optionally from a trial request. */
export function CreateSchoolDialog({ open, from, onClose }: { open: boolean; from?: TrialRequest | null; onClose: () => void }) {
  if (!open) return null;
  // Keyed so opening it for another request starts with that request's details.
  return <CreateSchoolForm key={from?.id ?? "blank"} from={from ?? null} onClose={onClose} />;
}

function CreateSchoolForm({ from, onClose }: { from: TrialRequest | null; onClose: () => void }) {
  const [form, setForm] = useState({
    name: from?.schoolName ?? "",
    city: from?.city ?? "",
    adminName: from?.contactName ?? "",
    adminEmail: from?.email ?? "",
    planTier: "TRIAL" as PlanTier,
  });
  const create = useCreateSchool();
  const set = (key: keyof typeof form) => (event: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: event.target.value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate(
      { ...form, trialRequestId: from?.id },
      {
        onSuccess: (school) => {
          toast(`${school.name} created. Invite sent to ${school.admin?.email}`);
          onClose();
        },
      },
    );
  };

  return (
    <Dialog
      open
      onClose={onClose}
      width={620}
      title="Create a school"
      description={from ? `From ${from.schoolName}'s trial request. Their admin gets an email to set a password.` : "The school's admin gets an email to set a password."}
    >
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="School name" value={form.name} onChange={set("name")} error={fieldError(create.error, "name")} data-autofocus />
          <TextField label="Town or city" value={form.city} onChange={set("city")} error={fieldError(create.error, "city")} />
          <TextField label="School admin's name" value={form.adminName} onChange={set("adminName")} error={fieldError(create.error, "adminName")} />
          <TextField label="Admin's email" type="email" value={form.adminEmail} onChange={set("adminEmail")} error={fieldError(create.error, "adminEmail")} autoCapitalize="none" spellCheck={false} />
        </div>
        <label className="grid gap-1.5 text-sm font-medium">
          Start on
          <select
            value={form.planTier}
            onChange={set("planTier")}
            className="min-h-[46px] rounded-[14px] border-0 bg-sunken px-4 text-base font-normal focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="TRIAL">A free 30-day trial</option>
            <option value="BASIC">The Basic plan</option>
            <option value="STANDARD">The Standard plan</option>
          </select>
        </label>
        {generalError(create.error) && <Alert tone="danger">{generalError(create.error)}</Alert>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending}>
            <Icon name="school" className="h-4 w-4" />
            Create school and send invite
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
