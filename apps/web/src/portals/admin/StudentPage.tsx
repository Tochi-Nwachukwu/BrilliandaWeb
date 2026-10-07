import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ordinal, type StudentEvent, type StudentRecord, type StudentResults, type TermResult } from "@brillanda/shared-types";
import { fieldError, generalError } from "../../shared/auth/LoginPage";
import { Alert } from "../../shared/components/Alert";
import { Badge, gradeToneFromLetter } from "../../shared/components/Badge";
import { Button } from "../../shared/components/Button";
import { Card, ProgressBar } from "../../shared/components/Cards";
import { EmptyState } from "../../shared/components/EmptyState";
import { Icon } from "../../shared/components/Icon";
import { Dialog } from "../../shared/components/Overlay";
import { ReportCardView } from "../../shared/components/ReportCardView";
import { PageSpinner } from "../../shared/components/Spinner";
import { FilterTabs } from "../../shared/components/Tabs";
import { TextAreaField } from "../../shared/components/TextField";
import { toast } from "../../shared/components/Toast";
import { termLabel, TrendChart } from "../../shared/components/TrendChart";
import { levelStyle } from "../../shared/theme/levels";
import { cx } from "../../shared/utils/cx";
import { formatDate, plural, timeAgo } from "../../shared/utils/time";
import { useAddNote, useDeleteNote, usePastReportCard, useReadmit, useRemoveStudentPhoto, useStudent, useStudentResults, useUploadStudentPhoto } from "./api";
import { ageOn, EditStudentDialog, InviteParentDialog, leftSummary, LeaveDialog } from "./enrolment";
import { ParentBadge, ReportCardDialog } from "./parts";

// One student's page (DECISIONS.md F-42): who they are, how this term is going, every past result,
// their classes year by year, what has happened on their record, and the school's notes.

type Tab = "overview" | "results" | "history" | "notes";
const TABS: Tab[] = ["overview", "results", "history", "notes"];
const first = (fullName: string) => fullName.split(" ")[0]!;
const initialsOf = (fullName: string) => fullName.split(" ").map((w) => w[0]).join("").slice(0, 2);

export function StudentPage() {
  const { studentId = "" } = useParams();
  const student = useStudent(studentId);
  const [params, setParams] = useSearchParams();
  const asked = params.get("tab") as Tab | null;
  const tab: Tab = asked && TABS.includes(asked) ? asked : "overview";

  if (student.isPending) return <PageSpinner />;
  if (student.error) {
    return (
      <>
        <BackLink />
        <Alert tone="danger">{student.error.message === "Not found" ? "This student couldn't be found. They may have been removed." : student.error.message}</Alert>
      </>
    );
  }
  const s = student.data;

  return (
    <>
      <BackLink />
      <Header student={s} />
      <div className="mb-5 mt-6">
        <FilterTabs
          label="Sections"
          value={tab}
          onChange={(next) => setParams(next === "overview" ? {} : { tab: next }, { replace: true })}
          items={[
            { value: "overview", label: "Overview" },
            { value: "results", label: "Results" },
            { value: "history", label: "History" },
            { value: "notes", label: "Notes", count: s.notes.length || undefined },
          ]}
        />
      </div>
      {tab === "overview" && <Overview student={s} />}
      {tab === "results" && <Results student={s} />}
      {tab === "history" && <History student={s} />}
      {tab === "notes" && <Notes student={s} />}
    </>
  );
}

function BackLink() {
  return (
    <Link to="/admin/students" className="-ml-1 mb-3 inline-flex items-center gap-1 rounded-md px-1 text-sm text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
      <Icon name="chevron" className="h-4 w-4 rotate-180" />
      Students
    </Link>
  );
}

function Header({ student: s }: { student: StudentRecord }) {
  const [dialog, setDialog] = useState<"edit" | "leave" | "invite" | null>(null);
  const readmit = useReadmit();
  const level = levelStyle(s.classOrder);
  const facts = [
    s.gender ? (s.gender === "FEMALE" ? "Female" : "Male") : null,
    s.dob ? `${ageOn(s.dob)} years old` : null,
    `Joined ${new Date(s.joinedOn).toLocaleDateString("en-GB", { month: "long", year: "numeric" })}`,
  ].filter(Boolean);

  return (
    <section className="relative overflow-hidden rounded-[28px] p-5 sm:p-7" style={{ ...level, background: "var(--tint)" }}>
      <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
        <Photo student={s} />
        <div className="min-w-0">
          <h1 className="text-[30px] font-medium leading-tight tracking-[-0.03em] sm:text-[38px]" style={{ color: "var(--color-text-primary)" }}>{s.fullName}</h1>
          <p className="mt-1 text-[15px]" style={{ color: "var(--deep)" }}>
            {s.status === "ACTIVE" ? s.armName : `Last in ${s.armName}`}, <span className="tabular-nums">{s.admissionNo}</span>
          </p>
          <p className="mt-1 text-sm text-text-secondary">{facts.join(". ")}.</p>
          {s.status !== "ACTIVE" && s.left && (
            <p className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-2xl bg-surface px-3 py-2 text-sm">
              <Badge tone="warning">{leftSummary(s)}</Badge>
              {s.left.reason && <span className="text-text-secondary">{s.left.reason}</span>}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setDialog("edit")}>Edit details or move class</Button>
            {s.status === "ACTIVE" && s.parentStatus === "NONE" && (
              <Button variant="secondary" onClick={() => setDialog("invite")}><Icon name="mail" className="h-4 w-4" />Invite parent</Button>
            )}
            {s.status === "ACTIVE" ? (
              <Button variant="danger-quiet" onClick={() => setDialog("leave")}>Mark as left</Button>
            ) : (
              <Button loading={readmit.isPending} onClick={() => readmit.mutate(s.id, { onSuccess: () => toast(`${first(s.fullName)} is back in ${s.armName}`) })}>Readmit to {s.armName}</Button>
            )}
          </div>
          {readmit.error && <div className="mt-3"><Alert tone="danger">{readmit.error.message}</Alert></div>}
        </div>
      </div>
      {dialog === "edit" && <EditStudentDialog student={s} onClose={() => setDialog(null)} />}
      {dialog === "leave" && <LeaveDialog student={s} onClose={() => setDialog(null)} />}
      <InviteParentDialog student={dialog === "invite" ? s : null} onClose={() => setDialog(null)} />
    </section>
  );
}

function Photo({ student: s }: { student: StudentRecord }) {
  const upload = useUploadStudentPhoto();
  const remove = useRemoveStudentPhoto();
  const input = useRef<HTMLInputElement>(null);
  const error = fieldError(upload.error, "photo") ?? generalError(upload.error);
  return (
    <div className="grid justify-items-start gap-2 sm:justify-items-center">
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="group relative grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-surface text-2xl font-semibold shadow-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:h-28 sm:w-28"
        style={{ color: "var(--deep)" }}
        aria-label={s.photoUrl ? `Change ${first(s.fullName)}'s photo` : `Add a photo of ${first(s.fullName)}`}
      >
        {s.photoUrl ? <img src={s.photoUrl} alt="" className="h-full w-full object-cover" /> : <span aria-hidden>{initialsOf(s.fullName)}</span>}
        <span aria-hidden className="absolute inset-x-0 bottom-0 bg-[color-mix(in_oklab,var(--color-text-primary)_62%,transparent)] py-1 text-center text-[11px] font-medium text-primary-text opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          {upload.isPending ? "Saving…" : s.photoUrl ? "Change" : "Add photo"}
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-label={`Choose a photo of ${first(s.fullName)}`}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload.mutate({ id: s.id, file }, { onSuccess: () => toast("Photo saved") });
          e.target.value = "";
        }}
      />
      {s.photoUrl && (
        <button type="button" className="text-[12.5px] text-text-secondary hover:text-danger" onClick={() => remove.mutate(s.id, { onSuccess: () => toast("Photo removed") })}>
          Remove photo
        </button>
      )}
      {error && <p className="max-w-[12rem] text-[12.5px] text-danger">{error}</p>}
    </div>
  );
}

function Overview({ student: s }: { student: StudentRecord }) {
  const results = useStudentResults(s.id);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        {results.isPending ? <PageSpinner /> : results.error ? <Alert tone="danger">{results.error.message}</Alert> : <ThisTerm student={s} current={results.data.current} lastPast={results.data.past.at(-1)} />}
      </div>
      <div className="grid min-w-0 content-start gap-4">
        <Card title="Parent or guardian">
          <Facts
            rows={[
              ["Name", s.guardian.name ?? "Not given"],
              ["Phone", s.guardian.phone ? <a className="hover:underline" href={`tel:${s.guardian.phone.replace(/\s/g, "")}`}>{s.guardian.phone}</a> : "Not given"],
              ["Email", s.guardian.email ?? "Not given"],
              ["Sees results", <ParentBadge key="p" status={s.parentStatus} />],
            ]}
          />
        </Card>
        <Card title="Details">
          <Facts
            rows={[
              ["Admission number", s.admissionNo],
              ["Gender", s.gender ? (s.gender === "FEMALE" ? "Female" : "Male") : "Not given"],
              ["Date of birth", s.dob ? `${formatDate(s.dob)} (${ageOn(s.dob)})` : "Not given"],
              ["Joined", formatDate(s.joinedOn)],
            ]}
          />
        </Card>
        {s.notes[0] && (
          <Card title="Latest note" action={<Link to="?tab=notes" className="text-[13px] font-medium text-accent hover:underline">All notes</Link>}>
            <p className="text-sm">{s.notes[0].text}</p>
            <p className="mt-2 text-[12.5px] text-text-muted">{s.notes[0].author}, {timeAgo(s.notes[0].createdAt)}</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function ThisTerm({ student: s, current, lastPast }: { student: StudentRecord; current: StudentResults["current"]; lastPast: TermResult | undefined }) {
  const [card, setCard] = useState(false);
  if (!current) {
    return (
      <Card title="This term">
        <p className="text-sm text-text-secondary">{first(s.fullName)} isn't in a class this term. {lastPast ? `Their last results were ${termLabel(lastPast)}.` : ""}</p>
      </Card>
    );
  }
  const done = current.subjects.filter((x) => x.complete).length;
  return (
    <Card
      title={`${current.term.name}, ${current.term.sessionName}`}
      description={`${current.armName}. ${current.published ? "Published to parents." : `${done} of ${current.subjects.length} subjects complete.`}`}
      action={current.average !== null ? <Button size="sm" variant="secondary" onClick={() => setCard(true)}>Report card</Button> : undefined}
    >
      <div className="mb-5 grid grid-cols-3 gap-2.5">
        <Stat label="Average" value={current.average !== null ? current.average.toFixed(1) : "—"} level={2} />
        <Stat label="Position" value={current.position ? `${ordinal(current.position)} of ${current.of}` : "—"} level={0} />
        <Stat label="Subjects in" value={`${done} of ${current.subjects.length}`} level={3} />
      </div>
      {current.average === null && <p className="-mt-2 mb-4 text-[13px] text-text-secondary">The average and position appear once every subject is complete.</p>}
      <ul className="grid gap-3">
        {current.subjects.map((sub, i) => (
          <li key={sub.subjectId} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5">
            <span className="truncate text-sm font-medium">{sub.subjectName}</span>
            <span className="flex items-center gap-2 text-sm">
              {sub.total === null ? (
                <span className="text-[12.5px] text-text-muted">Not entered yet</span>
              ) : (
                <>
                  <b className={cx("tabular-nums", !sub.complete && "font-normal text-text-secondary")}>{sub.total}</b>
                  {sub.grade ? <Badge tone={gradeToneFromLetter(sub.grade)}>{sub.grade}</Badge> : <span className="text-[12.5px] text-text-muted">so far</span>}
                </>
              )}
            </span>
            <ProgressBar className="col-span-2" value={(sub.total ?? 0) / 100} color={`var(--level-${(i % 6) + 1}-mid)`} delay={i * 0.04} />
          </li>
        ))}
      </ul>
      {card && <ReportCardDialog studentId={s.id} onClose={() => setCard(false)} />}
    </Card>
  );
}

function Stat({ label, value, level }: { label: string; value: string; level: number }) {
  return (
    <div className="grid gap-1 rounded-2xl p-3" style={{ ...levelStyle(level), background: "var(--tint)", color: "var(--deep)" }}>
      <span className="text-[12px] opacity-85">{label}</span>
      <b className="text-[17px] font-semibold tabular-nums">{value}</b>
    </div>
  );
}

function Results({ student: s }: { student: StudentRecord }) {
  const results = useStudentResults(s.id);
  const [open, setOpen] = useState<TermResult | null>(null);
  if (results.isPending) return <PageSpinner />;
  if (results.error) return <Alert tone="danger">{results.error.message}</Alert>;
  const past = results.data.past;
  if (!past.length) return <EmptyState title="No results yet">{first(s.fullName)}'s results appear here once their first term is published.</EmptyState>;

  const sessions = [...new Set(past.map((t) => t.term.sessionName))].reverse();
  // Unfinished terms would drag the line down with subjects nobody entered.
  const charted = past.filter((t) => !t.unfinished);
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <Card title="Average by term" description={charted.length > 9 ? `The last 9 of ${charted.length} terms` : plural(charted.length, "term")}>
        {charted.length ? <TrendChart terms={charted.slice(-9)} /> : <p className="text-sm text-text-secondary">No finished terms yet.</p>}
      </Card>
      <div className="grid min-w-0 content-start gap-4">
        {sessions.map((session) => (
          <Card key={session} title={session} description={past.find((t) => t.term.sessionName === session)!.armName}>
            <ul className="grid gap-1">
              {past.filter((t) => t.term.sessionName === session).map((t) => (
                <li key={t.term.id}>
                  <button type="button" onClick={() => setOpen(t)} className="grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl px-2.5 py-2 text-left text-sm hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                    <span className="font-medium">{t.term.name}</span>
                    <span className="tabular-nums text-text-secondary">{t.average.toFixed(1)}</span>
                    <span className="w-[5.5rem] text-right tabular-nums">
                      {t.unfinished ? <span className="text-text-muted" title="Some subjects weren't complete when the term closed">Unfinished</span> : t.position ? `${ordinal(t.position)} of ${t.of}` : <span className="text-text-muted">Not ranked</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      {open && <PastCardDialog studentId={s.id} term={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function PastCardDialog({ studentId, term, onClose }: { studentId: string; term: TermResult; onClose: () => void }) {
  const card = usePastReportCard(studentId, term.term.id);
  return (
    <Dialog open onClose={onClose} width={880} title="Report card" description={`${termLabel(term)}, ${term.armName}`}>
      {card.isPending ? <PageSpinner /> : card.error ? <Alert tone="danger">{card.error.message}</Alert> : <ReportCardView card={card.data} />}
    </Dialog>
  );
}

const EVENT_ICON: Record<StudentEvent["kind"], Parameters<typeof Icon>[0]["name"]> = {
  ENROLLED: "plus", MOVED: "classes", LEFT: "logout", READMITTED: "check", PARENT_INVITED: "mail", DETAILS_CHANGED: "settings",
};

function History({ student: s }: { student: StudentRecord }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card title="Classes" description="Their class in each session.">
        <ol className="grid gap-2">
          {[...s.classHistory].reverse().map((c, i) => (
            <li key={c.sessionName} className="flex items-center justify-between gap-3 rounded-2xl bg-sunken px-3.5 py-2.5 text-sm">
              <span className="tabular-nums text-text-secondary">{c.sessionName}</span>
              <b className="font-semibold">{c.armName}{i === 0 && s.status === "ACTIVE" ? <span className="ml-2 text-[12px] font-normal text-text-muted">now</span> : null}</b>
            </li>
          ))}
        </ol>
      </Card>
      <Card title="What's happened" description="Changes to their record, newest first.">
        <ol className="grid gap-3">
          {s.events.map((e, i) => (
            <li key={`${e.at}-${i}`} className="grid grid-cols-[2.25rem_minmax(0,1fr)] items-start gap-3">
              <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full bg-sunken text-text-secondary"><Icon name={EVENT_ICON[e.kind]} className="h-4 w-4" /></span>
              <span className="min-w-0 pt-0.5">
                <span className="block text-sm font-medium">{e.text}</span>
                <span className="text-[12.5px] text-text-muted">{formatDate(e.at)}</span>
              </span>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}

function Notes({ student: s }: { student: StudentRecord }) {
  const add = useAddNote();
  const remove = useDeleteNote();
  const [text, setText] = useState("");
  const submit = (event: FormEvent) => {
    event.preventDefault();
    add.mutate({ id: s.id, text }, { onSuccess: () => { setText(""); toast("Note saved"); } });
  };
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <Card title="Add a note" description="Only school staff see notes. Parents never do.">
        <form onSubmit={submit} className="grid gap-3" noValidate>
          <TextAreaField label="Note" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder={`e.g. ${first(s.fullName)} is asthmatic and keeps an inhaler in their bag.`} error={fieldError(add.error, "text")} />
          {generalError(add.error) && <Alert tone="danger">{generalError(add.error)}</Alert>}
          <div><Button type="submit" disabled={!text.trim()} loading={add.isPending}>Save note</Button></div>
        </form>
      </Card>
      <div className="grid min-w-0 content-start gap-3">
        {s.notes.length ? (
          s.notes.map((n) => (
            <article key={n.id} className="rounded-3xl bg-surface p-5 shadow-raised">
              <p className="whitespace-pre-line text-[15px]">{n.text}</p>
              <div className="mt-3 flex items-center justify-between gap-3 text-[12.5px] text-text-muted">
                <span>{n.author}, {formatDate(n.createdAt)}</span>
                <button type="button" className="font-medium hover:text-danger" disabled={remove.isPending} onClick={() => remove.mutate({ id: s.id, noteId: n.id }, { onSuccess: () => toast("Note removed") })}>
                  Remove<span className="sr-only"> note from {formatDate(n.createdAt)}</span>
                </button>
              </div>
            </article>
          ))
        ) : (
          <EmptyState title="No notes yet">Health needs, scholarships, things to keep an eye on. Anything staff should know.</EmptyState>
        )}
      </div>
    </div>
  );
}

function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-2.5 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-text-secondary">{label}</dt>
          <dd className="m-0 min-w-0 break-words text-right font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

