import { useState } from "react";
import { Link } from "react-router-dom";
import { ordinal, type SubjectResult } from "@brillanda/shared-types";
import { Alert } from "../../shared/components/Alert";
import { Badge, gradeToneFromLetter } from "../../shared/components/Badge";
import { Button } from "../../shared/components/Button";
import { Card } from "../../shared/components/Cards";
import { Carousel } from "../../shared/components/Carousel";
import { EmptyState } from "../../shared/components/EmptyState";
import { Icon } from "../../shared/components/Icon";
import { Ring } from "../../shared/components/Ring";
import { PageSpinner } from "../../shared/components/Spinner";
import { levelStyle } from "../../shared/theme/levels";
import { formatDate } from "../../shared/utils/time";
import { useChildren, useChildResults, useMarkSeen, useNotices } from "./api";
import { ChildSwitcher, firstName, ParentReportCardDialog, SubjectPanel, termLabel, TrendChart, useSelectedChild } from "./parts";

const SHOWN_AT_FIRST = 5;

export function HomePage() {
  const children = useChildren();
  const { child, select } = useSelectedChild(children.data);
  const results = useChildResults(child?.id);
  const notices = useNotices();
  const markSeen = useMarkSeen();
  const [allSubjects, setAllSubjects] = useState(false);
  const [openSubject, setOpenSubject] = useState<number | null>(null);
  const [cardTerm, setCardTerm] = useState<string | null>(null);

  if (children.isPending || (child && results.isPending)) return <PageSpinner />;
  if (children.error) return <Alert tone="danger">{children.error.message}</Alert>;
  if (!child) return <EmptyState title="No children linked yet">Ask your child's school to link your account to your child.</EmptyState>;
  if (results.error) return <Alert tone="danger">{results.error.message}</Alert>;
  if (!results.data) return null;

  const { terms, currentTerm } = results.data;
  const latest = terms[terms.length - 1];
  const name = firstName(child.fullName);
  if (!latest) {
    return (
      <EmptyState title={`No results for ${name} yet`}>
        You'll get an email as soon as {child.schoolName} publishes {name}'s first report card.
      </EmptyState>
    );
  }

  const previous = terms[terms.length - 2];
  const change = previous ? latest.average - previous.average : null;
  const best = latest.subjects.reduce((a, b) => (b.total > a.total ? b : a));
  const openCard = (termId: string) => {
    setCardTerm(termId);
    if (!latest.seen && termId === latest.term.id) markSeen.mutate({ childId: child.id, termId });
  };

  const slides = [
    latest.seen ? (
      currentTerm ? (
        <Slide key="status" icon="clock" title={`${currentTerm.term.name} results aren't out yet`}>
          You'll get an email when {child.schoolName} publishes them.
        </Slide>
      ) : (
        <Slide key="status" icon="check" title="You're up to date">You've seen {name}'s latest report card.</Slide>
      )
    ) : (
      <Slide key="status" icon="check" title="New results" tone="success">
        {name}'s {termLabel(latest)} results were published {formatDate(latest.publishedAt)}.
      </Slide>
    ),
    ...(latest.classTeacherRemark
      ? [
          <figure key="remark" className="m-0 grid h-full content-between gap-2 rounded-[20px] bg-sunken p-[18px]">
            <blockquote className="m-0 text-[17px] leading-snug tracking-[-0.01em]">“{latest.classTeacherRemark}”</blockquote>
            <figcaption className="text-[13px] text-text-secondary">Class teacher, {termLabel(latest)}</figcaption>
          </figure>,
        ]
      : []),
    ...(notices.data ?? []).map((n, i) =>
      i === 0 ? (
        <div key={n.id} className="grid h-full grid-cols-[110px_minmax(0,1fr)] items-center gap-3.5 rounded-[20px] bg-sunken p-2.5">
          <img src="/img/family.webp" alt="" loading="lazy" className="h-[92px] w-full rounded-[14px] object-cover" />
          <div><b className="block font-semibold">{n.title}</b><p className="text-[13px] text-text-secondary">{n.body}</p></div>
        </div>
      ) : (
        <Slide key={n.id} icon="clock" title={n.title}>{n.body}</Slide>
      ),
    ),
  ];

  return (
    <div className="space-y-6">
      <header
        className="relative isolate grid animate-pop items-center gap-5 overflow-hidden rounded-[28px] px-6 py-7 sm:grid-cols-[minmax(0,1fr)_auto] sm:px-8"
        style={{ background: "var(--hero-bg)", color: "var(--hero-text)" }}
      >
        <span aria-hidden className="absolute -right-10 -top-24 -z-10 h-56 w-56 animate-drift rounded-full opacity-70" style={{ background: "var(--level-1-tint)" }} />
        <div className="min-w-0">
          <ChildSwitcher children={children.data!} selected={child.id} onSelect={select} onDark />
          <h1 className="mt-4 text-balance text-[34px] font-medium leading-[1.02] tracking-[-0.04em] sm:text-[46px]">
            {name} came {ordinal(latest.position)} of {latest.of}.
          </h1>
          <p className="mt-2.5 max-w-[48ch] text-[16.5px]" style={{ color: "var(--hero-muted)" }}>
            {termLabel(latest)}, {latest.armName}. Average {latest.average.toFixed(1)}
            {change !== null ? `, ${change >= 0 ? "up" : "down"} ${Math.abs(change).toFixed(1)} on the term before` : ""}.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={() => openCard(latest.term.id)}>
              <Icon name="results" className="h-4 w-4" />
              View report card
            </Button>
            <Link to={`/portal/results?child=${child.id}`} className="inline-flex min-h-[42px] items-center rounded-full bg-[color-mix(in_oklab,var(--hero-text)_10%,transparent)] px-5 text-sm font-medium">
              All results
            </Link>
          </div>
        </div>
        <div aria-hidden className="relative hidden place-items-center sm:grid">
          <Ring value={latest.average / 100} label={latest.average.toFixed(1)} track="color-mix(in oklab, var(--hero-text) 12%, transparent)" className="h-[150px] w-[150px]" />
          {[
            "right-4 top-0 h-4 w-4 bg-[#9C8CF0]",
            "bottom-3 left-0 h-3 w-3 bg-[#FAF0C4] [animation-delay:0.7s]",
            "-right-2 top-[40%] h-2.5 w-2.5 bg-[#F4A3BC] [animation-delay:1.3s]",
            "left-6 top-0 h-2 w-2 bg-[#DAEAFB] [animation-delay:1.9s]",
          ].map((spot) => (
            <i key={spot} className={`absolute animate-[twinkle_2.6s_ease-in-out_infinite] [clip-path:polygon(50%_0,61%_39%,100%_50%,61%_61%,50%_100%,39%_61%,0_50%,39%_39%)] ${spot}`} />
          ))}
        </div>
      </header>

      {!latest.seen && (
        <Alert tone="success" action={<Button size="sm" variant="secondary" onClick={() => openCard(latest.term.id)}>Open it</Button>}>
          <b className="font-semibold">New:</b> {name}'s {termLabel(latest)} report card is ready.
        </Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card title="Subjects" description={`Best: ${best.subjectName}. Tap one for the breakdown.`}>
          <ul className="grid gap-0.5">
            {(allSubjects ? latest.subjects : latest.subjects.slice(0, SHOWN_AT_FIRST)).map((s, i) => (
              <li key={s.subjectName}>
                <SubjectRow subject={s} index={i} onOpen={() => setOpenSubject(i)} />
              </li>
            ))}
          </ul>
          {latest.subjects.length > SHOWN_AT_FIRST && (
            <button type="button" onClick={() => setAllSubjects((v) => !v)} className="mt-2 px-2.5 py-2 text-[13.5px] font-medium text-accent hover:underline">
              {allSubjects ? "Show fewer" : `Show all ${latest.subjects.length} subjects`}
            </button>
          )}
        </Card>
        <div className="grid content-start gap-4">
          <Card title="From school">
            <Carousel label="From school">{slides}</Carousel>
          </Card>
          <Card title="Average by term" description={`${terms.length} ${terms.length === 1 ? "term" : "terms"}`}>
            <TrendChart terms={terms} />
          </Card>
        </div>
      </div>

      <SubjectPanel
        subject={openSubject === null ? null : latest.subjects[openSubject]!}
        term={latest}
        childName={child.fullName}
        index={openSubject ?? 0}
        onClose={() => setOpenSubject(null)}
        onOpenCard={() => { setOpenSubject(null); openCard(latest.term.id); }}
      />
      <ParentReportCardDialog childId={child.id} termId={cardTerm} onClose={() => setCardTerm(null)} />
    </div>
  );
}

function SubjectRow({ subject, index, onOpen }: { subject: SubjectResult; index: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="grid w-full grid-cols-[10px_minmax(0,1fr)_2.8rem_auto] items-center gap-x-3 gap-y-1.5 rounded-2xl p-2.5 text-left text-[14.5px] hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      style={levelStyle(index)}
    >
      <span aria-hidden className="h-2.5 w-2.5 rounded-[4px]" style={{ background: "var(--mid)" }} />
      <span className="truncate">{subject.subjectName}</span>
      <span className="text-right font-semibold tabular-nums">{subject.total}</span>
      <Badge tone={gradeToneFromLetter(subject.grade)}>{subject.grade}</Badge>
      <span aria-hidden className="relative col-span-3 col-start-2 block h-1.5 overflow-hidden rounded-full bg-sunken">
        <span className="absolute inset-y-0 left-0 animate-grow rounded-full" style={{ width: `${subject.total}%`, background: "var(--mid)", ["--d" as string]: `${index * 0.04}s` }} />
      </span>
    </button>
  );
}

function Slide({ icon, title, tone, children }: { icon: "clock" | "check"; title: string; tone?: "success"; children: React.ReactNode }) {
  return (
    <div className={`flex h-full items-start gap-3 rounded-[20px] p-[18px] ${tone === "success" ? "bg-success-bg" : "bg-sunken"}`}>
      <Icon name={icon} className={`mt-0.5 h-[22px] w-[22px] shrink-0 ${tone === "success" ? "text-success" : "text-accent"}`} />
      <div><b className="block font-semibold">{title}</b><p className="mt-0.5 text-sm text-text-secondary">{children}</p></div>
    </div>
  );
}
