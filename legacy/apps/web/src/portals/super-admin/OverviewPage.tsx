import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { TrialRequest } from "@brillanda/shared-types";
import { useAuthStore } from "../../shared/auth/authStore";
import { Alert } from "../../shared/components/Alert";
import { Button } from "../../shared/components/Button";
import { Card, ProgressBar, StatCard } from "../../shared/components/Cards";
import { Carousel } from "../../shared/components/Carousel";
import { EmptyState } from "../../shared/components/EmptyState";
import { Hero } from "../../shared/components/Hero";
import { PageSpinner } from "../../shared/components/Spinner";
import { levelStyle } from "../../shared/theme/levels";
import { daysUntil, formatDay, formatDateTime, greeting, plural, timeAgo } from "../../shared/utils/time";
import { isOpen, useSchools, useTrialRequests, useUsage } from "./api";
import { CreateSchoolDialog, SchoolPanel, schoolState, scoresInLabel, STATE_LEVEL } from "./schools";

type Need = { key: string; level: number; badge: string; title: string; detail: ReactNode; action: ReactNode };

export function OverviewPage() {
  const user = useAuthStore((state) => state.user);
  const schools = useSchools();
  const trials = useTrialRequests();
  const usage = useUsage();
  const [creating, setCreating] = useState<{ from: TrialRequest | null } | null>(null);
  const [openSchool, setOpenSchool] = useState<string | null>(null);

  if (schools.isPending || trials.isPending) return <PageSpinner />;
  if (schools.error || trials.error) return <Alert tone="danger">{(schools.error ?? trials.error)!.message}</Alert>;

  const all = schools.data;
  const open = trials.data.filter(isOpen);
  const students = all.reduce((sum, s) => sum + s.studentCount, 0);
  const count = (state: string) => all.filter((s) => schoolState(s) === state).length;
  const endingSoon = all.filter((s) => schoolState(s) === "TRIAL" && s.trialEndsAt && daysUntil(s.trialEndsAt) <= 7);
  const suspended = all.filter((s) => schoolState(s) === "SUSPENDED");
  const firstName = user?.fullName.split(" ")[0];

  // What needs a person today, most urgent kind first.
  const needs: Need[] = [
    ...open.map((t) => ({
      key: t.id,
      level: 2,
      badge: initialsOf(t.schoolName),
      title: `${t.schoolName}, ${t.city}`,
      detail: t.status === "CALL_BOOKED" && t.callAt ? `Call booked: ${formatDateTime(t.callAt)}.` : `${t.contactName}${t.contactRole ? `, ${t.contactRole.toLowerCase()}` : ""}. About ${t.studentEstimate ?? "?"} students. Asked ${timeAgo(t.createdAt).toLowerCase()}.`,
      action: (
        <>
          <Button size="sm" onClick={() => setCreating({ from: t })}>
            Create school
          </Button>
          <Link to="/super-admin/trials" className="inline-flex min-h-[34px] items-center rounded-full px-3.5 text-[13px] font-medium shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)] hover:bg-[color-mix(in_oklab,var(--color-surface)_60%,transparent)]">
            Details
          </Link>
        </>
      ),
    })),
    ...endingSoon.map((s) => ({
      key: s.id,
      level: 4,
      badge: String(Math.max(0, daysUntil(s.trialEndsAt!))),
      title: `${s.name} has ${plural(Math.max(0, daysUntil(s.trialEndsAt!)), "day")} left on its trial`,
      detail: `${scoresInLabel(s)} of scores are in. A good moment to talk about a paid plan.`,
      action: (
        <Button size="sm" onClick={() => setOpenSchool(s.id)}>
          Open school
        </Button>
      ),
    })),
    ...suspended.map((s) => ({
      key: s.id,
      level: 5,
      badge: "!",
      title: `${s.name} is suspended`,
      detail: s.suspendedReason ?? "",
      action: (
        <Button size="sm" onClick={() => setOpenSchool(s.id)}>
          Review
        </Button>
      ),
    })),
  ];

  return (
    <div className="space-y-6">
      <Hero
        kicker={formatDay(new Date())}
        title={`${greeting()}${firstName ? `, ${firstName}` : ""}`}
        actions={
          <>
            <Link
              to="/super-admin/trials"
              className="inline-flex min-h-[42px] items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-text transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              Review trial requests
            </Link>
            <Button variant="soft" onClick={() => setCreating({ from: null })}>
              Create a school
            </Button>
          </>
        }
        photo={{
          src: "/img/courtyard.webp",
          alt: "Students crossing a school courtyard",
          caption: (
            <>
              <b className="block text-[15px] font-semibold text-text-primary">{plural(all.length, "school")} on Brillanda</b>
              {students.toLocaleString("en-GB")} students between them.
            </>
          ),
        }}
      >
        <p>
          {plural(all.length, "school")} and {students.toLocaleString("en-GB")} students on Brillanda.{" "}
          {open.length ? `${plural(open.length, "school has", "schools have")} asked for a trial.` : "No trial requests are waiting."}
        </p>
      </Hero>

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard to="/super-admin/schools" icon="school" label="Active schools" value={<>{count("ACTIVE")}<small className="ml-1 text-sm opacity-60">of {all.length}</small></>} note={`${count("TRIAL")} on trial`} level={0} index={0} />
        <StatCard to="/super-admin/trials" icon="inbox" label="Trial requests" value={open.length} note={open.length ? "Waiting for you" : "All clear"} level={2} index={1} />
        <StatCard to="/super-admin/schools" icon="students" label="Students" value={students.toLocaleString("en-GB")} note="Across every school" level={3} index={2} />
        <StatCard
          to="/super-admin/activity"
          icon="activity"
          label="Signed in today"
          value={usage.data ? usage.data.signedInToday.toLocaleString("en-GB") : "—"}
          note={usage.data ? `${Math.round((usage.data.byRole.teachers / Math.max(1, usage.data.signedInToday)) * 100)}% teachers` : undefined}
          level={4}
          index={3}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card title="This term, school by school" description="Share of scores already in" action={<Link to="/super-admin/schools" className="text-[13.5px] font-medium text-accent hover:underline">All schools</Link>}>
          <ul className="grid gap-1">
            {all
              .filter((s) => schoolState(s) !== "SUSPENDED")
              .map((s, i) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setOpenSchool(s.id)}
                    className="-mx-2.5 grid w-[calc(100%+20px)] grid-cols-[minmax(0,11rem)_minmax(0,1fr)_3.2rem] items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <b className="truncate font-semibold">{s.name}</b>
                    <ProgressBar value={s.scoresInShare ?? 0} color={`var(--level-${STATE_LEVEL[schoolState(s)] + 1}-mid)`} delay={i * 0.05} />
                    <span className="text-right text-[13px] tabular-nums text-text-secondary">{scoresInLabel(s)}</span>
                  </button>
                </li>
              ))}
          </ul>
        </Card>

        <Card title="Needs you" description={needs.length ? `${plural(needs.length, "thing")} to look at` : "All clear"}>
          {needs.length ? (
            <Carousel label="Needs you">
              {needs.map((need) => (
                <div key={need.key} className="grid h-full min-h-[190px] content-between gap-3 rounded-[20px] p-4" style={{ ...levelStyle(need.level), background: "var(--tint)", color: "var(--deep)" }}>
                  <div className="flex items-center gap-2.5">
                    <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface text-xs font-semibold">
                      {need.badge}
                    </span>
                    <b className="text-sm font-semibold leading-snug">{need.title}</b>
                  </div>
                  <p className="text-[13px] opacity-85">{need.detail}</p>
                  <div className="flex flex-wrap gap-1.5">{need.action}</div>
                </div>
              ))}
            </Carousel>
          ) : (
            <EmptyState title="Nothing needs you">No requests waiting, no trials ending and nobody suspended.</EmptyState>
          )}
        </Card>
      </div>

      <CreateSchoolDialog open={!!creating} from={creating?.from} onClose={() => setCreating(null)} />
      <SchoolPanel school={all.find((s) => s.id === openSchool) ?? null} onClose={() => setOpenSchool(null)} />
    </div>
  );
}

export const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .map((w) => w[0]!.toUpperCase())
    .slice(0, 2)
    .join("");
