import { termPosition, type TermPosition } from "@brillianda/core/calendar";
import { Card, StatCard } from "@brillianda/ui/Cards";
import { EmptyState } from "@brillianda/ui/EmptyState";
import { Hero } from "@brillianda/ui/Hero";
import { levelStyle } from "@brillianda/ui/levels";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { initials } from "@/lib/initials";
import { schoolFromParams } from "@/components/school/school";
import { hideChecklist } from "@/data/actions/home";
import { getCurrentMember } from "@/data/auth";
import { getHomeSummary, getSession, getSetupProgress } from "@/data/home";
import type { SessionSetup } from "@/data/types";
import { formatDate, formatDay, greeting, plural, timeAgo, todayInLagos } from "@/lib/time";
import { SetupChecklist } from "./SetupChecklist";

export const metadata: Metadata = { title: "Home" };

/** Where the school is in its year, for the greeting: "First Term, week 4 of 14." */
function whereWeAre(session: SessionSetup, position: TermPosition): string {
  if (position.kind === "in-term") return `${session.terms[position.index]!.name}, week ${position.week} of ${position.weeks}.`;
  if (position.kind === "break") return `Holiday. ${session.terms[position.nextIndex]!.name} starts ${formatDate(session.terms[position.nextIndex]!.startsOn)}.`;
  if (position.kind === "before") return `The ${session.name} session starts ${formatDate(session.terms[0]!.startsOn)}.`;
  return `The ${session.name} session has ended.`;
}

// Home in today's design (plan: the setup checklist first, then counts and recent changes).
export default async function SchoolHome({ params }: PageProps<"/s/[school]">) {
  const school = await schoolFromParams(params);
  // Greeting and term week depend on the time now.
  await connection();
  const [me, setup, summary, session] = await Promise.all([
    getCurrentMember(school.subdomain),
    getSetupProgress(school.subdomain),
    getHomeSummary(school.subdomain),
    getSession(school.subdomain),
  ]);
  if (!me || !setup || !summary || !session) return null;

  const now = new Date();
  const base = `/s/${school.subdomain}`;
  const isOwner = me.role === "owner";
  const steps = setup.items.filter((item) => isOwner || (item.id !== "admins" && item.id !== "branding"));
  const stepsDone = steps.filter((item) => item.done).length;
  // Required steps first, as in the checklist; the optional ones (branding, admins) come after.
  const optional = (id: string) => id === "admins" || id === "branding";
  const nextStep = steps.find((item) => !item.done && !optional(item.id)) ?? steps.find((item) => !item.done);
  const kicker = session.confirmed ? `${formatDay(now)}. ${whereWeAre(session, termPosition(session.terms, todayInLagos(now)))}` : formatDay(now);

  return (
    <div className="space-y-6">
      <Hero
        kicker={kicker}
        title={`${greeting(now)}, ${me.fullName.split(" ")[0]}`}
        actions={
          nextStep && (
            <Link
              href={nextStep.id === "calendar" ? `${base}/more/sessions` : nextStep.id === "admins" || nextStep.id === "branding" ? `${base}/more/${nextStep.id}` : `${base}/${nextStep.id === "arms" ? "classes" : nextStep.id}`}
              className="inline-flex min-h-[42px] items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-text transition-transform hover:-translate-y-px focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              {nextStep.id === "calendar" ? "Set your calendar" : "Continue setup"}
            </Link>
          )
        }
        photo={{
          src: "/img/teacher.webp",
          alt: "A teacher at work on a laptop",
          caption: (
            <>
              <b className="block text-[15px] font-semibold text-text-primary">
                {stepsDone} of {steps.length} setup steps done
              </b>
              {session.confirmed ? `${session.name} calendar set.` : "Start with your calendar."}
            </>
          ),
        }}
      >
        <p>
          {stepsDone === steps.length
            ? `${school.name} is set up: ${plural(summary.students, "student")} in ${plural(summary.arms, "arm")}.`
            : `You’ve done ${stepsDone} of ${steps.length} setup steps. Do them in any order and stop whenever you like.`}
        </p>
      </Hero>

      <SetupChecklist school={school.subdomain} schoolName={school.name} setup={setup} isOwner={isOwner} hide={hideChecklist.bind(null, school.subdomain)} />

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard href={`${base}/students`} icon="students" label="Students" value={summary.students} note={summary.students ? undefined : "None yet"} level={0} index={0} />
        <StatCard href={`${base}/classes`} icon="classes" label="Classes" value={summary.classes} note={plural(summary.arms, "arm")} level={1} index={1} />
        <StatCard href={`${base}/subjects`} icon="subjects" label="Subjects" value={summary.subjects} note={summary.subjects ? undefined : "None yet"} level={3} index={2} />
        <StatCard href={`${base}/more/admins`} icon="staff" label="Admins" value={summary.admins} note={summary.admins === 1 ? "Just you" : undefined} level={4} index={3} />
      </div>

      <Card title="Recent changes" description="Who changed what, newest first.">
        {summary.recent.length ? (
          <ul className="grid gap-1">
            {summary.recent.map((change, i) => (
              <li key={change.id} className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-center gap-3 rounded-xl py-1.5" style={levelStyle(i)}>
                <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full text-xs font-semibold" style={{ background: "var(--tint)", color: "var(--deep)" }}>
                  {initials(change.who)}
                </span>
                <span className="min-w-0 text-sm">
                  <b className="font-semibold">{change.who}</b> <span className="text-text-secondary">{change.what.charAt(0).toLowerCase() + change.what.slice(1)}</span>
                  <span className="block text-[12.5px] text-text-muted">{timeAgo(change.at, now.getTime())}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nothing yet">Changes to classes, subjects and students show here, with who made them.</EmptyState>
        )}
      </Card>
    </div>
  );
}
