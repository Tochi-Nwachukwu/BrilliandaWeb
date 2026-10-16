"use client";

import { optionLetter, type Response } from "@brillianda/core/questions";
import { Alert } from "@brillianda/ui/Alert";
import { Button } from "@brillianda/ui/Button";
import { Card } from "@brillianda/ui/Cards";
import { cx } from "@brillianda/ui/cx";
import { ResponsiveDialog } from "@brillianda/ui/ResponsiveDialog";
import { TextAreaField, TextField } from "@brillianda/ui/TextField";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { FormError } from "@/components/auth/FormError";
import type { ActionResult, TakingTest } from "@/data/types";

type Actions = {
  start: (input: unknown) => Promise<ActionResult<null>>;
  save: (input: unknown) => Promise<ActionResult<null>>;
  left: () => Promise<void>;
  submit: () => Promise<ActionResult<{ score: { total: number; max: number; complete: boolean } | null }>>;
};

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

/** A student's test (batch 25): start it, answer with the clock running, submit. */
export function TakeTest({ test, serverNow, back, actions }: { test: TakingTest; serverNow: number; back: string; actions: Actions }) {
  if (test.submitted) return <Submitted back={back} score={null} />;
  if (test.deadline === null) return <StartPage test={test} start={actions.start} />;
  return <Taking test={test} serverNow={serverNow} back={back} actions={actions} />;
}

function StartPage({ test, start }: { test: TakingTest; start: Actions["start"] }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <Card title={test.title} description={`${test.subjectName} · ${test.durationMinutes} minutes`}>
      <div className="grid gap-4">
        {test.instructions && <p className="whitespace-pre-line text-[15px] leading-relaxed">{test.instructions}</p>}
        <ul className="list-disc space-y-1 pl-5 text-sm text-text-secondary">
          <li>The clock starts when you press Start, and doesn’t stop if you leave.</li>
          <li>Your answers save as you go. If the connection drops, keep going: they save when it’s back.</li>
          <li>When time is up, the test is submitted for you.</li>
          {test.where === "school" && <li>This test is taken in school: your teacher gives you the code in the room.</li>}
        </ul>
        {test.where === "school" && (
          <TextField label="Code from your teacher" autoComplete="off" autoCapitalize="characters" value={code} onChange={(e) => (setCode(e.target.value), setError(undefined))} error={error} className="max-w-xs" />
        )}
        <FormError message={failure} />
        <Button
          size="lg"
          className="justify-self-start"
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              setFailure(null);
              const result = await start({ code });
              if (!result.ok) {
                setError(result.fieldErrors?.code?.[0]);
                return setFailure(result.fieldErrors ? null : result.error);
              }
              router.refresh();
            })
          }
        >
          Start the test
        </Button>
      </div>
    </Card>
  );
}

function Submitted({ back, score }: { back: string; score: { total: number; max: number; complete: boolean } | null }) {
  return (
    <Card title="Submitted">
      <div className="grid gap-3">
        <p className="text-[15px]">Your answers are in.{score ? "" : " Your teacher will share your score."}</p>
        {score && (
          <p className="text-sm">
            Your score: <b className="text-[20px] font-semibold tabular-nums">{score.total}</b> of {score.max}
            {!score.complete && " so far: your teacher still marks the written answers."}
          </p>
        )}
        <Link href={back} className="font-semibold text-accent underline underline-offset-2">
          Back to your tests
        </Link>
      </div>
    </Card>
  );
}

type SaveState = "saved" | "saving" | "offline";

function Taking({ test, serverNow, back, actions }: { test: TakingTest; serverNow: number; back: string; actions: Actions }) {
  // The server's clock decides; this keeps our countdown in step with it.
  const [offset] = useState(() => serverNow - Date.now());
  const [now, setNow] = useState(serverNow);
  const [answers, setAnswers] = useState<Record<number, Response>>(test.responses);
  const [current, setCurrent] = useState(0);
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState<SaveState>("saved");
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState<{ score: { total: number; max: number; complete: boolean } | null } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const queue = useRef(new Map<number, Response | null>());
  const timers = useRef(new Map<number, number>());
  const submitting = useRef(false);
  const retry = useRef<() => void>(() => {});
  const autoSubmit = useRef<() => void>(() => {});
  const left = test.deadline! - now;
  const q = test.questions[current]!;
  const answered = test.questions.filter((x) => answers[x.index] !== undefined).length;

  const flush = useCallback(async () => {
    if (!queue.current.size) return setSaving("saved");
    setSaving("saving");
    for (const [index, response] of [...queue.current]) {
      const result = await actions.save({ index, response }).catch(() => null);
      if (result?.ok) queue.current.delete(index);
      else if (result && !result.ok) {
        queue.current.delete(index);
        setFailure(result.error);
      } else {
        // No connection: keep it and try again shortly.
        setSaving("offline");
        window.setTimeout(() => retry.current(), 3000);
        return;
      }
    }
    setSaving(queue.current.size ? "saving" : "saved");
  }, [actions]);

  const answer = (index: number, response: Response | null, wait = 0) => {
    setAnswers((all) => {
      const next = { ...all };
      if (response === null) delete next[index];
      else next[index] = response;
      return next;
    });
    queue.current.set(index, response);
    window.clearTimeout(timers.current.get(index));
    timers.current.set(index, window.setTimeout(flush, wait));
  };

  const submit = useCallback(async () => {
    if (submitting.current) return;
    submitting.current = true;
    await flush();
    const result = await actions.submit();
    if (!result.ok) {
      submitting.current = false;
      return setFailure(result.error);
    }
    setDone({ score: result.data.score });
  }, [actions, flush]);

  useEffect(() => {
    retry.current = () => void flush();
    autoSubmit.current = () => void submit();
  }, [flush, submit]);

  // The clock. When time's up, what's there is submitted.
  useEffect(() => {
    const tick = window.setInterval(() => {
      const t = Date.now() + offset;
      setNow(t);
      if (t >= test.deadline!) autoSubmit.current();
    }, 1000);
    return () => window.clearInterval(tick);
  }, [offset, test.deadline]);

  // Leaving the page (another tab or app) is noted for the teacher.
  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && void actions.left();
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [actions]);

  if (done) return <Submitted back={back} score={done.score} />;

  const value = answers[q.index];
  const lowTime = left < 2 * 60_000;

  return (
    <div className="grid gap-4">
      <div className="sticky top-2 z-20 flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-surface p-3 shadow-float">
        <div className="min-w-0">
          <b className="block truncate text-sm font-semibold">{test.title}</b>
          <span className="text-[12.5px] text-text-secondary">
            {answered} of {test.questions.length} answered ·{" "}
            <span aria-live="polite">{saving === "saved" ? "Saved" : saving === "saving" ? "Saving…" : "No connection: will save when it’s back"}</span>
          </span>
        </div>
        <span role="timer" aria-label={`Time left: ${clock(left)}`} className={cx("rounded-full px-3.5 py-1.5 text-[17px] font-semibold tabular-nums", lowTime ? "bg-danger-bg text-danger" : "bg-sunken")}>
          {clock(left)}
        </span>
      </div>

      <nav aria-label="Questions" className="flex flex-wrap gap-1.5">
        {test.questions.map((x, i) => (
          <button
            key={x.index}
            type="button"
            aria-current={i === current ? "step" : undefined}
            aria-label={`Question ${i + 1}${answers[x.index] !== undefined ? ", answered" : ""}${flagged.has(x.index) ? ", flagged" : ""}`}
            onClick={() => setCurrent(i)}
            className={cx(
              "relative grid h-10 w-10 place-items-center rounded-xl text-sm font-semibold focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent",
              i === current ? "bg-primary text-primary-text" : answers[x.index] !== undefined ? "bg-accent-soft text-accent" : "bg-raise shadow-raised",
            )}
          >
            {i + 1}
            {flagged.has(x.index) && <span aria-hidden className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-warning" />}
          </button>
        ))}
      </nav>

      <section aria-labelledby="question-heading" className="rounded-3xl bg-surface p-5 shadow-raised sm:p-6">
        <p id="question-heading" className="text-[12.5px] font-medium text-text-secondary">
          Question {current + 1} of {test.questions.length} · {q.marks === 1 ? "1 mark" : `${q.marks} marks`}
        </p>
        <p className="mt-2 whitespace-pre-line text-[17px] leading-relaxed">{q.text}</p>

        <div className="mt-4">
          {q.type === "objective" && (
            <fieldset className="grid gap-2">
              <legend className="sr-only">Choose one answer</legend>
              {q.options.map((o, i) => {
                const chosen = value && "option" in value && value.option === o.index;
                return (
                  <label key={o.index} className={cx("flex min-h-[48px] cursor-pointer items-center gap-3 rounded-2xl px-4 py-2.5 text-[15px] has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent", chosen ? "bg-accent-soft font-semibold text-accent" : "bg-sunken hover:bg-hover")}>
                    <input type="radio" name={`q${q.index}`} checked={!!chosen} onChange={() => answer(q.index, { option: o.index })} className="h-5 w-5 accent-[var(--color-accent)]" />
                    <span className="w-5 shrink-0 font-semibold">{optionLetter(i)}.</span>
                    <span>{o.text}</span>
                  </label>
                );
              })}
            </fieldset>
          )}
          {q.type === "trueFalse" && (
            <fieldset className="grid grid-cols-2 gap-2">
              <legend className="sr-only">True or false</legend>
              {[true, false].map((v) => {
                const chosen = value && "value" in value && value.value === v;
                return (
                  <label key={String(v)} className={cx("flex min-h-[48px] cursor-pointer items-center justify-center gap-2 rounded-2xl text-[15px] font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent", chosen ? "bg-accent-soft text-accent" : "bg-sunken hover:bg-hover")}>
                    <input type="radio" name={`q${q.index}`} checked={!!chosen} onChange={() => answer(q.index, { value: v })} className="h-5 w-5 accent-[var(--color-accent)]" />
                    {v ? "True" : "False"}
                  </label>
                );
              })}
            </fieldset>
          )}
          {q.type === "fillGap" && (
            <TextField
              key={q.index}
              label="Your answer"
              autoComplete="off"
              defaultValue={value && "text" in value ? value.text : ""}
              onChange={(e) => answer(q.index, e.target.value.trim() ? { text: e.target.value } : null, 800)}
            />
          )}
          {q.type === "theory" && (
            <TextAreaField
              key={q.index}
              label="Your answer"
              rows={8}
              defaultValue={value && "text" in value ? value.text : ""}
              onChange={(e) => answer(q.index, e.target.value.trim() ? { text: e.target.value } : null, 1200)}
            />
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button variant="secondary" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
            Back
          </Button>
          {current < test.questions.length - 1 ? (
            <Button onClick={() => setCurrent((c) => c + 1)}>Next</Button>
          ) : (
            <Button onClick={() => setConfirming(true)}>Finish</Button>
          )}
          <Button
            variant="ghost"
            aria-pressed={flagged.has(q.index)}
            onClick={() =>
              setFlagged((all) => {
                const next = new Set(all);
                if (next.has(q.index)) next.delete(q.index);
                else next.add(q.index);
                return next;
              })
            }
          >
            {flagged.has(q.index) ? "Unflag" : "Flag to come back to"}
          </Button>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FormError message={failure} />
        <Button variant="secondary" onClick={() => setConfirming(true)}>
          Submit the test
        </Button>
      </div>

      {confirming && (
        <ResponsiveDialog
          open
          onClose={() => setConfirming(false)}
          title="Submit the test?"
          description={answered < test.questions.length ? `You haven’t answered ${test.questions.length - answered} of ${test.questions.length} questions.` : "You’ve answered every question."}
          footer={
            <div className="grid gap-2">
              <Button onClick={() => void submit()}>Submit</Button>
              <Button variant="ghost" onClick={() => setConfirming(false)}>
                Keep going
              </Button>
            </div>
          }
        >
          {flagged.size > 0 && <Alert tone="warning">{flagged.size === 1 ? "1 question is flagged" : `${flagged.size} questions are flagged`} to come back to.</Alert>}
          <p className="text-sm text-text-secondary">You can’t change your answers after submitting.</p>
        </ResponsiveDialog>
      )}
    </div>
  );
}
