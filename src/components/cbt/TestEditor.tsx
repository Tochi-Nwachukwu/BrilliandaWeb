"use client";

import { testSettingsSchema, WHERE, WHERE_LABEL, type Where } from "@brillianda/core/cbt";
import { QUESTION_TYPE_LABEL, totalMarks } from "@brillianda/core/questions";
import { Alert } from "@brillianda/ui/Alert";
import { Button } from "@brillianda/ui/Button";
import { Card } from "@brillianda/ui/Cards";
import { SelectField, TextAreaField, TextField } from "@brillianda/ui/TextField";
import { toast } from "@brillianda/ui/Toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormError } from "@/components/auth/FormError";
import type { ActionResult, TestEditorData } from "@/data/types";
import { errorsOf } from "@/components/questions/QuestionParts";

const pairKey = (p: { subjectId: string; levelId: string }) => `${p.subjectId}|${p.levelId}`;
/** A datetime-local value (the device's time, in Nigeria Lagos time) from an ISO time, and back. */
const toLocal = (iso: string) => {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const fromLocal = (local: string) => (local ? new Date(local).toISOString() : "");

/** Setting a test (batch 25): its class, questions from the bank, window and rules. */
export function TestEditor({ data, base, save }: { data: TestEditorData; base: string; save: (input: unknown) => Promise<ActionResult<{ id: string }>> }) {
  const router = useRouter();
  const t = data.test;
  const [pair, setPair] = useState(t ? pairKey(t) : data.pairs[0] ? pairKey(data.pairs[0]) : "");
  const current = data.pairs.find((p) => pairKey(p) === pair);
  const [now] = useState(() => Date.now());
  const [title, setTitle] = useState(t?.title ?? "");
  const [instructions, setInstructions] = useState(t?.instructions ?? "Answer every question.");
  const [armIds, setArmIds] = useState<string[]>(t?.armIds ?? (current?.arms.length === 1 ? [current.arms[0]!.id] : []));
  const [questionIds, setQuestionIds] = useState<string[]>(t?.questionIds ?? []);
  const [duration, setDuration] = useState(String(t?.durationMinutes ?? 30));
  const [opensAt, setOpensAt] = useState(toLocal(t?.opensAt ?? new Date(now + 3_600_000).toISOString()));
  const [closesAt, setClosesAt] = useState(toLocal(t?.closesAt ?? new Date(now + 7 * 86_400_000).toISOString()));
  const [where, setWhere] = useState<Where>(t?.where ?? "anywhere");
  const [shuffle, setShuffle] = useState(t?.shuffle ?? true);
  const [showScore, setShowScore] = useState(t?.showScore ?? true);
  const [componentId, setComponentId] = useState(t?.componentId ?? data.components[0]?.id ?? "");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!data.pairs.length) {
    return <Alert tone="info">You can set tests for the classes you teach a subject in. Ask your school’s admin to give you one in Teachers.</Alert>;
  }

  const bank = data.bank.filter((q) => pairKey(q) === pair);
  const chosen = bank.filter((q) => questionIds.includes(q.id));
  const err = (k: string) => errors[k]?.[0];

  const submit = (publish: boolean) => {
    setFailure(null);
    const settings = {
      title,
      instructions,
      armIds,
      questionIds,
      durationMinutes: duration,
      opensAt: fromLocal(opensAt),
      closesAt: fromLocal(closesAt),
      where,
      shuffle,
      showScore,
      componentId,
    };
    const checked = testSettingsSchema.safeParse(settings);
    if (!checked.success) {
      setErrors(errorsOf(checked.error.issues));
      return setFailure(checked.error.issues[0]?.message ?? "Please check the test.");
    }
    startTransition(async () => {
      const [subjectId, levelId] = pair.split("|");
      const result = await save({ id: t?.id, subjectId, levelId, publish, settings: checked.data });
      if (!result.ok) return setFailure(result.error);
      toast(publish ? "Test set. Students see it when it opens." : "Draft saved");
      router.push(`${base}/${result.data.id}`);
      router.refresh();
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
      <Card title="The test">
        <div className="grid gap-4">
          <SelectField
            label="Subject and class"
            value={pair}
            onChange={(e) => {
              setPair(e.target.value);
              setQuestionIds([]);
              const p = data.pairs.find((x) => pairKey(x) === e.target.value);
              setArmIds(p?.arms.length === 1 ? [p.arms[0]!.id] : []);
            }}
          >
            {data.pairs.map((p) => (
              <option key={pairKey(p)} value={pairKey(p)}>
                {p.levelName} {p.subjectName}
              </option>
            ))}
          </SelectField>
          <TextField label="Title" placeholder="e.g. Fractions: class test" value={title} onChange={(e) => setTitle(e.target.value)} error={err("title")} />
          <TextAreaField label="Instructions for students" rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} error={err("instructions")} />
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Classes</legend>
            <div className="flex flex-wrap gap-2">
              {current?.arms.map((a) => (
                <label key={a.id} className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-sunken px-3.5 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent">
                  <input
                    type="checkbox"
                    checked={armIds.includes(a.id)}
                    onChange={(e) => setArmIds((all) => (e.target.checked ? [...all, a.id] : all.filter((x) => x !== a.id)))}
                    className="h-4 w-4 accent-[var(--color-accent)]"
                  />
                  {a.label}
                </label>
              ))}
            </div>
            {err("armIds") && <p className="mt-1 text-sm text-danger">{err("armIds")}</p>}
          </fieldset>
          <div className="grid grid-cols-2 gap-3">
            <TextField label="Opens" type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} error={err("opensAt")} />
            <TextField label="Closes" type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} error={err("closesAt")} />
          </div>
          <TextField label="Length, in minutes" inputMode="numeric" value={duration} onChange={(e) => setDuration(e.target.value)} error={err("durationMinutes")} className="max-w-[12rem]" />
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Where</legend>
            {WHERE.map((w) => (
              <label key={w} className="flex items-center gap-3 text-sm">
                <input type="radio" name="where" checked={where === w} onChange={() => setWhere(w)} className="h-4 w-4 accent-[var(--color-accent)]" />
                {WHERE_LABEL[w]}
              </label>
            ))}
            {where === "school" && <p className="text-[12.5px] text-text-secondary">Students need a code to start. You’ll see it on the test’s page, to show in the room.</p>}
          </fieldset>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
            Shuffle the questions and options for each student
          </label>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={showScore} onChange={(e) => setShowScore(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
            Show students their score when they submit
          </label>
          <SelectField label="Scores go into" hint="When you send them, after marking. They’re scaled to the part’s marks." value={componentId} onChange={(e) => setComponentId(e.target.value)}>
            {data.components.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (out of {c.maxScore})
              </option>
            ))}
          </SelectField>
        </div>
      </Card>

      <Card title="Questions" description={`${chosen.length} chosen · ${totalMarks(chosen.map((q) => q.question))} marks`}>
        {bank.length === 0 ? (
          <p className="text-sm text-text-secondary">
            No questions in this subject’s bank yet.{" "}
            <Link href={base.replace(/\/tests$/, "/questions")} className="font-semibold text-accent underline underline-offset-2">
              Add some
            </Link>{" "}
            first.
          </p>
        ) : (
          <div className="grid gap-2">
            <Button size="sm" variant="secondary" className="justify-self-start" onClick={() => setQuestionIds(chosen.length === bank.length ? [] : bank.map((q) => q.id))}>
              {chosen.length === bank.length ? "Choose none" : `Choose all ${bank.length}`}
            </Button>
            <ul className="grid gap-1.5" aria-label="Questions to choose from">
              {bank.map((q) => (
                <li key={q.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-sunken p-3 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent">
                    <input
                      type="checkbox"
                      checked={questionIds.includes(q.id)}
                      onChange={(e) => setQuestionIds((all) => (e.target.checked ? [...all, q.id] : all.filter((x) => x !== q.id)))}
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                    />
                    <span className="min-w-0">
                      <span className="block">{q.question.text}</span>
                      <span className="text-[12px] text-text-secondary">
                        {QUESTION_TYPE_LABEL[q.question.type]} · {q.question.marks === 1 ? "1 mark" : `${q.question.marks} marks`}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            {err("questionIds") && <p className="text-sm text-danger">{err("questionIds")}</p>}
          </div>
        )}
      </Card>

      <div className="flex flex-wrap items-center gap-2 lg:col-span-2">
        <Button loading={pending} onClick={() => submit(true)}>
          Set the test
        </Button>
        <Button variant="secondary" loading={pending} onClick={() => submit(false)}>
          Save as a draft
        </Button>
        <FormError message={failure} />
      </div>
    </div>
  );
}
