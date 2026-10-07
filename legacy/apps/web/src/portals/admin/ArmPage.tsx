import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { computeSubjectTotal, ordinal, type EntryState } from "@brillanda/shared-types";
import { Alert } from "../../shared/components/Alert";
import { Badge, EntryStatusBadge } from "../../shared/components/Badge";
import { Button } from "../../shared/components/Button";
import { ProgressBar } from "../../shared/components/Cards";
import { ChevronLeft } from "../../shared/components/icons";
import { Icon } from "../../shared/components/Icon";
import { PageSpinner } from "../../shared/components/Spinner";
import { FilterTabs } from "../../shared/components/Tabs";
import { toast } from "../../shared/components/Toast";
import { levelOfArm, levelStyle } from "../../shared/theme/levels";
import { plural, timeAgo } from "../../shared/utils/time";
import { ScoreGrid, type RowTotal } from "../teacher/score-entry/ScoreGrid";
import { useScoreCells, valuesOf } from "../teacher/score-entry/useScoreCells";
import { useAdminSheet, useArm, useDecideUnlock } from "./api";
import { ParentBadge, RemindDialog, ReportCardDialog } from "./parts";
import { PublishDialog } from "./PublishingPage";

const Back = ({ to, label }: { to: string; label: string }) => (
  <Link to={to} className="-ml-1 mb-4 inline-flex items-center gap-1 rounded-md px-1 text-sm text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
    <ChevronLeft className="h-4 w-4" />
    {label}
  </Link>
);

export function ArmPage() {
  const { armId = "" } = useParams();
  const arm = useArm(armId);
  const decide = useDecideUnlock();
  const [tab, setTab] = useState<"SUBJECTS" | "STUDENTS">("SUBJECTS");
  const [reminding, setReminding] = useState<{ id: string; fullName: string } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  if (arm.isPending) return <PageSpinner />;
  if (arm.error) return (<><Back to="/admin/classes" label="Classes" /><Alert tone="danger">{arm.error.message}</Alert></>);

  const a = arm.data;
  const done = a.sheets.filter((s) => s.status === "COMPLETE" || s.status === "LOCKED").length;
  const ready = a.publishStatus === "COMPLETE";
  const published = a.publishStatus === "PUBLISHED";
  const level = levelStyle(a.classOrder);

  return (
    <>
      <Back to="/admin/classes" label="Classes" />
      <header className="mb-5 flex animate-pop flex-wrap items-end justify-between gap-4 rounded-[28px] p-6 sm:p-7" style={{ ...level, background: "var(--tint)", color: "var(--deep)" }}>
        <div>
          <h1 className="text-[40px] font-medium leading-none tracking-[-0.04em] sm:text-[52px]">{a.name}</h1>
          <p className="mt-2 opacity-85">{plural(a.studentCount, "student")}.{a.formTeacher ? ` Form teacher ${a.formTeacher.fullName}.` : ""}</p>
        </div>
        <dl className="flex gap-7">
          <div><dt className="text-[12.5px] opacity-80">Subjects complete</dt><dd className="m-0 text-[28px] font-medium tracking-[-0.03em] tabular-nums">{done} of {a.sheets.length}</dd></div>
          <div><dt className="text-[12.5px] opacity-80">Status</dt><dd className="m-0 pt-2 text-lg font-medium">{published ? "Published" : ready ? "Ready to publish" : "Scores coming in"}</dd></div>
        </dl>
      </header>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs label="Show" value={tab} onChange={setTab} items={[{ value: "SUBJECTS", label: "Subjects" }, { value: "STUDENTS", label: "Students", count: a.studentCount }]} />
        {ready && <Button onClick={() => setPublishing(true)}><Icon name="publish" className="h-4 w-4" />Publish {a.name}</Button>}
        {published && a.students[0] && <Button variant="secondary" onClick={() => setPreview(a.students[0]!.id)}>Preview a report card</Button>}
      </div>

      {tab === "SUBJECTS" ? (
        <ul className="grid gap-0.5 rounded-3xl bg-surface p-2 shadow-raised" style={level}>
          {a.sheets.map((s) => (
            <li key={s.subjectId} className="grid items-center gap-x-4 gap-y-2 rounded-2xl p-3 hover:bg-hover sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_8rem_auto]">
              <div className="min-w-0">
                <b className="font-semibold">{s.subjectName}</b>
                <p className="text-[12.5px] text-text-secondary">
                  {s.teacher?.fullName ?? "No teacher assigned"}
                  {s.remindedAt && !s.unlockRequest ? `. Reminded ${timeAgo(s.remindedAt).toLowerCase()}` : ""}
                </p>
                {s.unlockRequest && <p className="mt-1 text-[13px] text-danger">Asked to reopen: “{s.unlockRequest.reason}”</p>}
              </div>
              <div className="flex items-center gap-2.5">
                <ProgressBar value={s.studentsComplete / Math.max(1, a.studentCount)} color="var(--mid)" className="flex-1" />
                <span className="whitespace-nowrap text-[12.5px] tabular-nums text-text-secondary">{s.studentsComplete}/{a.studentCount}</span>
              </div>
              <div>{published ? <Badge>Published</Badge> : <EntryStatusBadge status={s.status as EntryState} />}</div>
              <div className="flex flex-wrap justify-end gap-1.5">
                {s.unlockRequest ? (
                  <>
                    <Button size="sm" disabled={decide.isPending} onClick={() => decide.mutate({ id: s.unlockRequest!.id, decision: "approve" }, { onSuccess: () => toast(`Reopened. ${s.teacher?.fullName ?? "The teacher"} can edit ${s.subjectName} again`) })}>Reopen</Button>
                    <Button size="sm" variant="secondary" disabled={decide.isPending} onClick={() => decide.mutate({ id: s.unlockRequest!.id, decision: "decline" }, { onSuccess: () => toast("Declined. We've let them know") })}>Decline</Button>
                  </>
                ) : (
                  (s.status === "NOT_STARTED" || s.status === "IN_PROGRESS") && s.teacher && (
                    <Button size="sm" variant="secondary" onClick={() => setReminding(s.teacher)}>Remind</Button>
                  )
                )}
                <Link to={`/admin/classes/${a.id}/sheets/${s.subjectId}`} className="inline-flex min-h-[34px] items-center rounded-full bg-raise px-3.5 text-[13px] font-medium shadow-raised hover:bg-hover">View</Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="grid gap-0.5 rounded-3xl bg-surface p-2 shadow-raised">
          {a.students.map((st) => (
            <li key={st.id} className="grid grid-cols-[2.4rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl p-2.5 hover:bg-hover sm:grid-cols-[2.4rem_minmax(0,1fr)_7rem_6rem_auto]">
              <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full text-xs font-semibold" style={{ background: "var(--tint)", color: "var(--deep)", ...level }}>
                {st.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
              </span>
              <div className="min-w-0"><b className="font-medium">{st.fullName}</b><p className="text-[12.5px] text-text-secondary">{st.admissionNo}</p></div>
              <div className="hidden sm:block"><ParentBadge status={st.parentStatus} /></div>
              <div className="hidden text-right text-sm tabular-nums sm:block">{st.average !== null ? st.average.toFixed(2) : "—"}</div>
              <div className="flex items-center justify-end gap-2 text-sm">
                {st.position ? <span className="tabular-nums">{ordinal(st.position)} of {a.studentCount}</span> : null}
                {(ready || published) && <Button size="sm" variant="secondary" onClick={() => setPreview(st.id)}>Report card</Button>}
              </div>
            </li>
          ))}
        </ul>
      )}

      <RemindDialog teachers={reminding ? [{ teacher: reminding, sheets: a.sheets.filter((s) => s.teacher?.id === reminding.id && s.status !== "COMPLETE" && s.status !== "LOCKED").length }] : []} open={!!reminding} onClose={() => setReminding(null)} />
      <ReportCardDialog studentId={preview} onClose={() => setPreview(null)} />
      <PublishDialog armIds={publishing ? [a.id] : []} onClose={() => setPublishing(false)} />
    </>
  );
}

/** A teacher's sheet, read-only: the admin sees exactly what the teacher entered. */
export function AdminSheetPage() {
  const { armId = "", subjectId = "" } = useParams();
  const sheet = useAdminSheet(armId, subjectId);
  if (sheet.isPending) return <PageSpinner />;
  if (sheet.error) return (<><Back to={`/admin/classes/${armId}`} label="Back to the class" /><Alert tone="danger">{sheet.error.message}</Alert></>);
  return <ReadOnlySheet key={`${armId}/${subjectId}`} sheet={sheet.data} />;
}

function ReadOnlySheet({ sheet }: { sheet: NonNullable<ReturnType<typeof useAdminSheet>["data"]> }) {
  const cells = useScoreCells(sheet, () => undefined);
  const totals = useMemo<RowTotal[]>(
    () => sheet.rows.map((row) => {
      const values = valuesOf(cells.views[row.studentId]);
      return { ...computeSubjectTotal(sheet.components, values), anyEntered: Object.values(values).some(Boolean) };
    }),
    [sheet, cells.views],
  );
  return (
    <>
      <Back to={`/admin/classes/${sheet.arm.id}`} label={sheet.arm.name} />
      <header className="mb-4 flex items-center gap-4">
        <span aria-hidden className="grid h-14 w-14 place-items-center rounded-2xl text-lg font-semibold" style={{ ...levelStyle(levelOfArm(sheet.arm.name)), background: "var(--tint)", color: "var(--deep)" }}>
          {sheet.arm.name.replace(/^\s*(JSS|SS)\s*/i, "")}
        </span>
        <div>
          <h1 className="text-[30px] font-medium leading-tight tracking-[-0.03em] sm:text-[36px]">{sheet.subject.name}</h1>
          <div className="flex flex-wrap items-center gap-3 text-text-secondary">{sheet.arm.name}, {sheet.term.name} {sheet.term.sessionName}<EntryStatusBadge status={sheet.status} /></div>
        </div>
      </header>
      <div className="mb-4"><Alert tone="info">You're seeing this sheet as the teacher entered it. Only the subject teacher can change scores.</Alert></div>
      <ScoreGrid sheet={sheet} views={cells.views} totals={totals} readOnly onCommit={cells.commit} />
    </>
  );
}
