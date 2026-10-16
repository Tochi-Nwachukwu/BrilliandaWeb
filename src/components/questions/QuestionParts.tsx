"use client";

import { DIFFICULTIES, optionLetter, QUESTION_TYPE_LABEL, QUESTION_TYPES, type Question, type QuestionType } from "@brillianda/core/questions";
import { Badge } from "@brillianda/ui/Badge";
import { Button } from "@brillianda/ui/Button";
import { cx } from "@brillianda/ui/cx";
import { SelectField, TextAreaField, TextField } from "@brillianda/ui/TextField";
import { useId, type ReactNode } from "react";

const marksLabel = (m: number) => (m === 1 ? "1 mark" : `${m} marks`);

/** One question as a teacher reads it: the answer shown (batch 24). */
export function QuestionCard({ question: q, number, footer, aside }: { question: Question; number?: number; footer?: ReactNode; aside?: ReactNode }) {
  return (
    <article className="rounded-2xl bg-surface p-4 shadow-raised">
      <div className="flex flex-wrap items-center gap-2 text-[12.5px] text-text-secondary">
        {number !== undefined && <b className="text-text-primary">{number}.</b>}
        <Badge tone="neutral">{QUESTION_TYPE_LABEL[q.type]}</Badge>
        <span>{marksLabel(q.marks)}</span>
        {q.topic && <span>· {q.topic}</span>}
        <span>· {q.difficulty}</span>
        {aside && <span className="ml-auto">{aside}</span>}
      </div>
      <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed">{q.text}</p>
      {q.type === "objective" && (
        <ol className="mt-2 grid gap-1 text-sm">
          {q.options.map((o, i) => (
            <li key={i} className={cx("flex gap-2 rounded-xl px-2.5 py-1.5", i === q.answer ? "bg-success-bg font-semibold text-success" : "")}>
              <span className="w-4 shrink-0">{optionLetter(i)}.</span>
              <span>{o}</span>
              {i === q.answer && <span className="sr-only">(the right answer)</span>}
            </li>
          ))}
        </ol>
      )}
      {q.type === "trueFalse" && <p className="mt-2 text-sm font-semibold text-success">Answer: {q.answer ? "True" : "False"}</p>}
      {q.type === "fillGap" && <p className="mt-2 text-sm font-semibold text-success">Accepted: {q.answers.join(", ")}</p>}
      {q.type === "theory" && q.guide && <p className="mt-2 rounded-xl bg-sunken p-2.5 text-sm text-text-secondary">Marking guide: {q.guide}</p>}
      {footer && <div className="mt-3 flex flex-wrap gap-2">{footer}</div>}
    </article>
  );
}

/** A blank question of a type, keeping what carries over (text, marks, topic). */
export function blankQuestion(type: QuestionType, from?: Partial<Question>): Question {
  const base = { text: from?.text ?? "", marks: type === "theory" ? 5 : (from?.marks ?? 1), topic: from?.topic ?? "", difficulty: from?.difficulty ?? "medium" };
  if (type === "objective") return { type, ...base, options: ["", "", "", ""], answer: 0 };
  if (type === "trueFalse") return { type, ...base, answer: true };
  if (type === "fillGap") return { type, ...base, answers: [""] };
  return { type, ...base, guide: "" };
}

/** Writing or fixing one question (batch 24). */
export function QuestionEditor({ value: q, onChange, errors = {} }: { value: Question; onChange: (q: Question) => void; errors?: Record<string, string[]> }) {
  const id = useId();
  const err = (key: string) => errors[key]?.[0];
  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SelectField label="Type" value={q.type} onChange={(e) => onChange(blankQuestion(e.target.value as QuestionType, q))} className="col-span-2 sm:col-span-1">
          {QUESTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {QUESTION_TYPE_LABEL[t]}
            </option>
          ))}
        </SelectField>
        <TextField label="Marks" inputMode="decimal" value={String(q.marks)} onChange={(e) => onChange({ ...q, marks: Number(e.target.value) || 0 })} error={err("marks")} />
        <SelectField label="Difficulty" value={q.difficulty} onChange={(e) => onChange({ ...q, difficulty: e.target.value as Question["difficulty"] })}>
          {DIFFICULTIES.map((d) => (
            <option key={d} value={d}>
              {d[0]!.toUpperCase() + d.slice(1)}
            </option>
          ))}
        </SelectField>
        <TextField label="Topic" value={q.topic} onChange={(e) => onChange({ ...q, topic: e.target.value })} error={err("topic")} />
      </div>
      <TextAreaField label="Question" rows={3} value={q.text} onChange={(e) => onChange({ ...q, text: e.target.value })} error={err("text")} hint={q.type === "fillGap" ? "Write ____ where the gap goes." : undefined} />

      {q.type === "objective" && (
        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">Options: tick the right one</legend>
          {q.options.map((o, i) => (
            <div key={i} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
              <input
                type="radio"
                name={`${id}-answer`}
                checked={q.answer === i}
                onChange={() => onChange({ ...q, answer: i })}
                aria-label={`Option ${optionLetter(i)} is the right answer`}
                className="h-5 w-5 accent-[var(--color-accent)]"
              />
              <TextField label={`Option ${optionLetter(i)}`} className="[&>label]:sr-only" value={o} onChange={(e) => onChange({ ...q, options: q.options.map((x, j) => (j === i ? e.target.value : x)) })} error={err(`options.${i}`)} />
              {q.options.length > 2 ? (
                <Button
                  size="sm"
                  variant="danger-quiet"
                  aria-label={`Remove option ${optionLetter(i)}`}
                  onClick={() => onChange({ ...q, options: q.options.filter((_, j) => j !== i), answer: q.answer === i ? 0 : q.answer > i ? q.answer - 1 : q.answer })}
                >
                  Remove
                </Button>
              ) : (
                <span />
              )}
            </div>
          ))}
          {q.options.length < 5 && (
            <Button size="sm" variant="secondary" className="justify-self-start" onClick={() => onChange({ ...q, options: [...q.options, ""] })}>
              Add an option
            </Button>
          )}
          {err("answer") && <p className="text-sm text-danger">{err("answer")}</p>}
        </fieldset>
      )}

      {q.type === "trueFalse" && (
        <SelectField label="Answer" value={q.answer ? "true" : "false"} onChange={(e) => onChange({ ...q, answer: e.target.value === "true" })}>
          <option value="true">True</option>
          <option value="false">False</option>
        </SelectField>
      )}

      {q.type === "fillGap" && (
        <TextField
          label="Accepted answers"
          hint="Separate them with commas. Capitals and spaces don’t matter."
          value={q.answers.join(", ")}
          onChange={(e) => onChange({ ...q, answers: e.target.value.split(",").map((a) => a.trimStart()) })}
          error={err("answers") ?? err("answers.0")}
        />
      )}

      {q.type === "theory" && (
        <TextAreaField label="Marking guide" rows={2} hint="What a full answer includes, for whoever marks it." value={q.guide} onChange={(e) => onChange({ ...q, guide: e.target.value })} error={err("guide")} />
      )}
    </div>
  );
}

/** Errors from a failed check, keyed like `options.1`. */
export function errorsOf(issues: { path: PropertyKey[]; message: string }[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const i of issues) (out[i.path.map(String).join(".")] ??= []).push(i.message);
  return out;
}
