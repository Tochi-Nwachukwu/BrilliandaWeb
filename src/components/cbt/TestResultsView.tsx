"use client";

import { WHERE_LABEL } from "@brillianda/core/cbt";
import { markAnswer, optionLetter, type Question, type Response } from "@brillianda/core/questions";
import { Alert } from "@brillianda/ui/Alert";
import { Badge } from "@brillianda/ui/Badge";
import { Button } from "@brillianda/ui/Button";
import { Card } from "@brillianda/ui/Cards";
import { ResponsiveDialog } from "@brillianda/ui/ResponsiveDialog";
import { TextField } from "@brillianda/ui/TextField";
import { toast } from "@brillianda/ui/Toast";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult, TestResults } from "@/data/types";

type Row = TestResults["rows"][number];
const STATE = { "not started": "neutral", "in progress": "warning", submitted: "success" } as const;
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: "Africa/Lagos", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function shownAnswer(q: Question, r: Response | undefined): string {
  if (!r) return "No answer";
  if (q.type === "objective" && "option" in r) return `${optionLetter(r.option)}. ${q.options[r.option] ?? ""}`;
  if (q.type === "trueFalse" && "value" in r) return r.value ? "True" : "False";
  return "text" in r ? r.text : "No answer";
}

/** A test's results (batch 25): who took it, marking theory answers, and sending scores to the sheet. */
export function TestResultsView({
  results,
  mark,
  send,
}: {
  results: TestResults;
  mark: (input: unknown) => Promise<ActionResult<null>>;
  send: () => Promise<ActionResult<{ sent: number; skipped: number; lockedClasses: string[] }>>;
}) {
  const router = useRouter();
  const t = results.test;
  const [open, setOpen] = useState<Row | null>(null);
  const [pending, startTransition] = useTransition();
  const ready = results.rows.filter((r) => r.state === "submitted" && r.score && r.score.toMark === 0).length;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card title="Submitted">
          <p className="text-[24px] font-medium tabular-nums">
            {t.submitted}
            <span className="text-sm text-text-secondary"> of {t.students}</span>
          </p>
        </Card>
        <Card title="To mark">
          <p className="text-[24px] font-medium tabular-nums">{t.toMark}</p>
          <p className="text-[12.5px] text-text-secondary">theory answers</p>
        </Card>
        <Card title={t.where === "school" ? "Code for the room" : "Where"}>
          {t.where === "school" ? <p className="font-mono text-[24px] font-semibold tracking-[0.2em]">{t.accessCode}</p> : <p className="text-sm">{WHERE_LABEL[t.where]}</p>}
        </Card>
      </div>

      <p className="text-sm text-text-secondary">
        {t.status === "draft" ? "Draft: students can’t see it yet." : `Open ${when(t.opensAt)} to ${when(t.closesAt)}.`} {t.questions} questions, {t.marks} marks, {t.durationMinutes} minutes.
      </p>

      <Card
        title="Students"
        action={
          t.component && (
            <Button
              loading={pending}
              disabled={!ready}
              onClick={() =>
                startTransition(async () => {
                  const result = await send();
                  if (!result.ok) return toast(result.error);
                  const d = result.data;
                  toast(
                    `Sent ${d.sent} scores to ${t.component!.name}` +
                      (d.skipped ? `; ${d.skipped} not yet (still to submit or mark)` : "") +
                      (d.lockedClasses.length ? `; ${d.lockedClasses.join(", ")} skipped: the sheet is marked complete` : ""),
                  );
                  router.refresh();
                })
              }
            >
              Send {ready} scores to {t.component.name}
            </Button>
          )
        }
      >
        {t.sentAt && <Alert tone="success">Scores were sent to {t.component?.name}. Sending again updates them.</Alert>}
        <ul className="mt-2 grid gap-1.5" aria-label="Students">
          {results.rows.map((r) => (
            <li key={r.studentId} className="grid gap-2 rounded-2xl bg-sunken p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <span className="min-w-0">
                <b className="block truncate font-semibold">{r.fullName}</b>
                <span className="text-[12.5px] text-text-secondary">
                  {r.armLabel}
                  {r.leftPage > 0 && ` · left the test page ${r.leftPage === 1 ? "once" : `${r.leftPage} times`}`}
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-2 sm:justify-end">
                <Badge tone={STATE[r.state]}>{r.state === "submitted" ? "Submitted" : r.state === "in progress" ? "Taking it now" : "Not started"}</Badge>
                {r.score && r.state === "submitted" && (
                  <span className="text-sm tabular-nums">
                    {r.score.total} / {r.score.max}
                    {r.score.toMark > 0 && <span className="text-text-secondary"> ({r.score.toMark} to mark)</span>}
                  </span>
                )}
                {r.state === "submitted" && (
                  <Button size="sm" variant="secondary" onClick={() => setOpen(r)}>
                    {r.score && r.score.toMark > 0 ? "Mark" : "Answers"}
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Questions" description="How the class did on each.">
        <ol className="grid gap-1.5">
          {t.questionList.map((q, i) => {
            const s = results.stats[i]!;
            return (
              <li key={i} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-2xl bg-sunken p-3 text-sm">
                <span className="min-w-0 truncate">
                  {i + 1}. {q.text}
                </span>
                <span className="text-text-secondary tabular-nums">{s.right === null ? `${s.answered} answered` : `${s.right} of ${s.answered} right`}</span>
              </li>
            );
          })}
        </ol>
      </Card>

      {open && <AnswersDialog row={results.rows.find((r) => r.studentId === open.studentId) ?? open} questions={t.questionList} mark={mark} onClose={() => setOpen(null)} />}
    </div>
  );
}

function AnswersDialog({ row, questions, mark, onClose }: { row: Row; questions: Question[]; mark: (input: unknown) => Promise<ActionResult<null>>; onClose: () => void }) {
  const router = useRouter();
  return (
    <ResponsiveDialog open onClose={onClose} laptop="panel" width={560} title={`${row.fullName}’s answers`} description={row.score ? `${row.score.total} of ${row.score.max} so far` : undefined}>
      <ol className="grid gap-3">
        {questions.map((q, i) => {
          const r = row.responses[i];
          const auto = markAnswer(q, r ?? null);
          return (
            <li key={i} className="rounded-2xl bg-surface p-4 shadow-raised">
              <p className="text-[12.5px] text-text-secondary">
                {i + 1}. {q.marks === 1 ? "1 mark" : `${q.marks} marks`}
              </p>
              <p className="mt-1 text-sm font-medium">{q.text}</p>
              <p className="mt-2 whitespace-pre-line rounded-xl bg-sunken p-2.5 text-sm">{shownAnswer(q, r)}</p>
              {auto !== null ? (
                <p className={`mt-2 text-sm font-semibold ${auto > 0 ? "text-success" : "text-danger"}`}>
                  {auto > 0 ? `Right: ${auto}` : "Not right: 0"}
                  {auto === 0 && q.type === "objective" && ` (answer: ${optionLetter(q.answer)})`}
                </p>
              ) : r ? (
                <TheoryMark max={q.marks} initial={row.theoryMarks[i]} guide={q.type === "theory" ? q.guide : ""} save={(marks) => mark({ attemptId: row.attemptId, index: i, marks })} onSaved={() => router.refresh()} />
              ) : (
                <p className="mt-2 text-sm text-text-secondary">Left blank: 0</p>
              )}
            </li>
          );
        })}
      </ol>
    </ResponsiveDialog>
  );
}

function TheoryMark({ max, initial, guide, save, onSaved }: { max: number; initial: number | undefined; guide: string; save: (marks: number) => Promise<ActionResult<null>>; onSaved: () => void }) {
  const [value, setValue] = useState(initial === undefined ? "" : String(initial));
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();
  return (
    <div className="mt-2 grid gap-2">
      {guide && <p className="text-[12.5px] text-text-secondary">Marking guide: {guide}</p>}
      <div className="flex items-end gap-2">
        <TextField label={`Marks, out of ${max}`} inputMode="decimal" value={value} onChange={(e) => (setValue(e.target.value), setError(undefined))} error={error} className="max-w-[10rem]" />
        <Button
          size="sm"
          className="mb-1"
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await save(Number(value));
              if (!result.ok) return setError(result.error);
              toast("Mark saved");
              onSaved();
            })
          }
        >
          Save mark
        </Button>
      </div>
    </div>
  );
}
