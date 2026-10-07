import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../shared/auth/authStore";
import { Alert } from "../../shared/components/Alert";
import { Button } from "../../shared/components/Button";
import { Card, ProgressBar, StatCard } from "../../shared/components/Cards";
import { Carousel } from "../../shared/components/Carousel";
import { EmptyState } from "../../shared/components/EmptyState";
import { Hero } from "../../shared/components/Hero";
import { PageSpinner } from "../../shared/components/Spinner";
import { toast } from "../../shared/components/Toast";
import { levelStyle } from "../../shared/theme/levels";
import { cx } from "../../shared/utils/cx";
import { formatDay, greeting, plural, timeAgo } from "../../shared/utils/time";
import { isDone, useArms, useDecideUnlock, useOverview, useSetup, useUnlockRequests } from "./api";
import { RemindDialog, WeeklyChart } from "./parts";
import { SetupChecklist } from "./SetupChecklist";

type Need = { key: string; level: number; badge: string; title: string; detail: ReactNode; action: ReactNode };

const LEVEL_NAMES = ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"];

export function HomePage() {
  const user = useAuthStore((state) => state.user);
  const overview = useOverview();
  const arms = useArms();
  const unlocks = useUnlockRequests();
  const decide = useDecideUnlock();
  const setup = useSetup();
  const [view, setView] = useState<"classes" | "weekly">("classes");
  const [reminding, setReminding] = useState(false);

  if (overview.isPending || arms.isPending) return <PageSpinner />;
  if (overview.error || arms.error) return <Alert tone="danger">{(overview.error ?? arms.error)!.message}</Alert>;

  const o = overview.data;
  const title = user ? `${greeting()}, ${user.fullName.split(" ")[0]}` : greeting();
  const linked = o.students ? Math.round(((o.students - o.studentsWithoutParent) / o.students) * 100) : 0;

  const needs: Need[] = [
    ...(unlocks.data ?? []).map((u) => ({
      key: u.id,
      level: 1,
      badge: u.requestedBy.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2),
      title: `${u.requestedBy.fullName} wants to reopen ${u.armName} ${u.subjectName}`,
      detail: <>“{u.reason}” <span className="opacity-70">{timeAgo(u.createdAt)}.</span></>,
      action: (
        <>
          <Button size="sm" disabled={decide.isPending} onClick={() => decide.mutate({ id: u.id, decision: "approve" }, { onSuccess: () => toast(`Reopened. ${u.requestedBy.fullName} can edit ${u.armName} ${u.subjectName} again`) })}>
            Reopen
          </Button>
          <Button size="sm" variant="secondary" disabled={decide.isPending} onClick={() => decide.mutate({ id: u.id, decision: "decline" }, { onSuccess: () => toast(`Declined. We've let ${u.requestedBy.fullName} know`) })}>
            Decline
          </Button>
        </>
      ),
    })),
    ...(o.teachersBehind.length
      ? [{
          key: "behind",
          level: 3,
          badge: String(o.teachersBehind.length),
          title: `${plural(o.teachersBehind.length, "teacher is", "teachers are")} behind`,
          detail: o.teachersBehind.slice(0, 2).map((t) => `${t.teacher.fullName} (${t.sheets})`).join(", ") + (o.teachersBehind.length > 2 ? ` and ${o.teachersBehind.length - 2} more.` : "."),
          action: <Button size="sm" onClick={() => setReminding(true)}>Send reminders</Button>,
        }]
      : []),
    ...(o.studentsWithoutParent
      ? [{
          key: "parents",
          level: 0,
          badge: String(o.studentsWithoutParent),
          title: `${plural(o.studentsWithoutParent, "student has", "students have")} no parent linked`,
          detail: "Their parents can't see results until they're invited.",
          action: <Link to="/admin/students?unlinked=1" className="inline-flex min-h-[34px] items-center rounded-full bg-primary px-3.5 text-[13px] font-medium text-primary-text">Invite parents</Link>,
        }]
      : []),
  ];

  const byLevel = LEVEL_NAMES.map((name, order) => {
    const inLevel = arms.data.filter((a) => a.classOrder === order);
    const total = inLevel.reduce((n, a) => n + a.subjects.length, 0);
    const done = inLevel.reduce((n, a) => n + a.subjects.filter((s) => isDone(s.status)).length, 0);
    return { name, order, done, total };
  });

  return (
    <div className="space-y-6">
      <Hero
        kicker={o.term && o.week ? `${formatDay(new Date())}. ${o.term.name}, week ${o.week.number} of ${o.week.of}.` : formatDay(new Date())}
        title={title}
        actions={
          <>
            <Link to="/admin/publishing" className="inline-flex min-h-[42px] items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-text transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
              {o.armsReadyToPublish ? "Review and publish" : "Open publishing"}
            </Link>
            {o.teachersBehind.length > 0 && <Button variant="soft" onClick={() => setReminding(true)}>Remind teachers</Button>}
          </>
        }
        photo={{
          src: "/img/teacher.webp",
          alt: "A teacher entering scores on a laptop",
          caption: (
            <>
              <b className="block text-[15px] font-semibold text-text-primary">{o.sheets.complete} of {o.sheets.total} subject sheets done</b>
              Across {plural(arms.data.length, "class", "classes")} this term.
            </>
          ),
        }}
      >
        <p>
          {o.sheets.complete} of {o.sheets.total} subjects are in
          {o.armsReadyToPublish ? `, and ${plural(o.armsReadyToPublish, "class is", "classes are")} ready to publish.` : "."}
          {o.scoresDueAt ? ` Scores are due ${formatDay(o.scoresDueAt)}.` : ""}
        </p>
      </Hero>

      {setup.data && <SetupChecklist setup={setup.data} schoolName={user?.school?.name ?? "your school"} />}

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <StatCard to="/admin/classes" icon="check" label="Subjects in" value={<>{o.sheets.complete}<small className="ml-1 text-sm opacity-60">of {o.sheets.total}</small></>} note={`${o.sheets.inProgress} in progress`} level={0} index={0} />
        <StatCard to="/admin/publishing" icon="publish" label="Ready to publish" value={<>{o.armsReadyToPublish}<small className="ml-1 text-sm opacity-60">{o.armsReadyToPublish === 1 ? "class" : "classes"}</small></>} note={o.armsPublished ? `${o.armsPublished} published` : "Waiting for you"} level={2} index={1} />
        <StatCard to="/admin/classes" icon="inbox" label="Reopen requests" value={o.pendingUnlockRequests} note={o.pendingUnlockRequests ? "Waiting for you" : "All clear"} level={5} index={2} />
        <StatCard to="/admin/students" icon="students" label="Parents linked" value={<>{linked}<small className="ml-0.5 text-sm opacity-60">%</small></>} note={`${o.studentsWithoutParent} to invite`} level={3} index={3} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card
          title="Progress"
          description={view === "classes" ? "Subjects complete in each class" : "Sheets complete, week by week"}
          action={
            <div role="group" aria-label="Show progress" className="inline-flex rounded-full bg-sunken p-[3px]">
              {(["classes", "weekly"] as const).map((v) => (
                <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={cx("h-[30px] rounded-full px-3 text-[13px] font-medium", view === v ? "bg-raise text-text-primary shadow-raised" : "text-text-secondary")}>
                  {v === "classes" ? "By class" : "Weekly"}
                </button>
              ))}
            </div>
          }
        >
          {view === "classes" ? (
            <ul className="grid gap-1">
              {byLevel.map((level, i) => (
                <li key={level.name}>
                  <Link to={`/admin/classes?level=${level.order}`} className="-mx-2.5 grid grid-cols-[4rem_minmax(0,1fr)_3.4rem] items-center gap-3 rounded-xl px-2.5 py-2 text-sm hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                    <b className="font-semibold">{level.name}</b>
                    <ProgressBar value={level.done / Math.max(1, level.total)} color={`var(--level-${level.order + 1}-mid)`} delay={i * 0.06} />
                    <span className="text-right text-[13px] tabular-nums text-text-secondary">{level.done} / {level.total}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <WeeklyChart weeks={o.completeByWeek} max={o.sheets.total} />
          )}
        </Card>

        <Card title="Needs you" description={needs.length ? `${plural(needs.length, "thing")} to look at` : "All clear"}>
          {needs.length ? (
            <Carousel label="Needs you">
              {needs.map((need) => (
                <div key={need.key} className="grid h-full min-h-[190px] content-between gap-3 rounded-[20px] p-4" style={{ ...levelStyle(need.level), background: "var(--tint)", color: "var(--deep)" }}>
                  <div className="flex items-center gap-2.5">
                    <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface text-xs font-semibold">{need.badge}</span>
                    <b className="text-sm font-semibold leading-snug">{need.title}</b>
                  </div>
                  <p className="text-[13px] opacity-85">{need.detail}</p>
                  <div className="flex flex-wrap gap-1.5">{need.action}</div>
                </div>
              ))}
            </Carousel>
          ) : (
            <EmptyState title="Nothing needs you">No requests and nobody behind. Enjoy the quiet.</EmptyState>
          )}
        </Card>
      </div>

      <RemindDialog teachers={o.teachersBehind} open={reminding} onClose={() => setReminding(false)} />
    </div>
  );
}
