"use client";

import { QUESTION_TYPE_LABEL, QUESTION_TYPES, questionSchema, totalMarks, type GenerateRequest, type Question } from "@brillianda/core/questions";
import { Alert } from "@brillianda/ui/Alert";
import { Badge } from "@brillianda/ui/Badge";
import { Button } from "@brillianda/ui/Button";
import { ProgressBar } from "@brillianda/ui/Cards";
import { EmptyState } from "@brillianda/ui/EmptyState";
import { ResponsiveDialog } from "@brillianda/ui/ResponsiveDialog";
import { Spinner } from "@brillianda/ui/Spinner";
import { SelectField, TextAreaField, TextField } from "@brillianda/ui/TextField";
import { toast } from "@brillianda/ui/Toast";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormError } from "@/components/auth/FormError";
import type { ActionResult, BankQuestion, QuestionBankPage } from "@/data/types";
import { blankQuestion, errorsOf, QuestionCard, QuestionEditor } from "./QuestionParts";

export type BankActions = {
  generate: (input: unknown) => Promise<ActionResult<{ questions: Question[]; usage: QuestionBankPage["usage"] }>>;
  save: (input: unknown) => Promise<ActionResult<{ saved: number }>>;
  update: (id: string, input: unknown) => Promise<ActionResult<null>>;
  remove: (id: string) => Promise<ActionResult<null>>;
};

const pairKey = (p: { subjectId: string; levelId: string }) => `${p.subjectId}|${p.levelId}`;

/** The question bank (batch 24): filter, write, generate with AI, edit and delete. */
export function QuestionBank({ page, actions }: { page: QuestionBankPage; actions: BankActions }) {
  const router = useRouter();
  const [pair, setPair] = useState("");
  const [type, setType] = useState("");
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<{ kind: "write" } | { kind: "generate" } | { kind: "edit"; item: BankQuestion } | null>(null);
  const [pending, startTransition] = useTransition();
  const label = (p: { subjectId: string; levelId: string }) => {
    const found = page.pairs.find((x) => pairKey(x) === pairKey(p));
    return found ? `${found.levelName} ${found.subjectName}` : "";
  };
  const shown = page.questions.filter(
    (q) => (!pair || pairKey(q) === pair) && (!type || q.question.type === type) && (!query.trim() || `${q.question.text} ${q.question.topic}`.toLowerCase().includes(query.trim().toLowerCase())),
  );

  if (!page.pairs.length) {
    return <EmptyState title="No subjects to write for yet">Questions belong to the subjects and classes you teach. Ask your school’s admin to give you a subject in Teachers.</EmptyState>;
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-surface p-4 shadow-raised">
        <div className="min-w-[14rem] flex-1">
          <p className="text-sm">
            <b className="font-semibold">AI this month:</b> {page.usage.used} of {page.usage.limit} generations used by your school
          </p>
          <ProgressBar value={page.usage.used / page.usage.limit} color="var(--color-chart)" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setDialog({ kind: "write" })}>
            Write a question
          </Button>
          <Button onClick={() => setDialog({ kind: "generate" })}>Generate questions</Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_minmax(0,1fr)]">
        <SelectField label="Subject and class" value={pair} onChange={(e) => setPair(e.target.value)}>
          <option value="">All of them</option>
          {page.pairs.map((p) => (
            <option key={pairKey(p)} value={pairKey(p)}>
              {p.levelName} {p.subjectName}
            </option>
          ))}
        </SelectField>
        <SelectField label="Type" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Every type</option>
          {QUESTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {QUESTION_TYPE_LABEL[t]}
            </option>
          ))}
        </SelectField>
        <TextField label="Search questions" type="search" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <p className="text-sm text-text-secondary">
        {shown.length === 1 ? "1 question" : `${shown.length} questions`} · {totalMarks(shown.map((q) => q.question))} marks
      </p>

      {shown.length === 0 ? (
        <EmptyState title="No questions here yet">Write one, or generate a set with AI and check it.</EmptyState>
      ) : (
        <ol className="grid gap-3" aria-label="Questions">
          {shown.map((item) => (
            <li key={item.id}>
              <QuestionCard
                question={item.question}
                aside={
                  <span className="flex items-center gap-2">
                    <span>{label(item)}</span>
                    {item.source === "ai" ? <Badge tone="info">From AI, checked by {item.by}</Badge> : <span>by {item.by}</span>}
                  </span>
                }
                footer={
                  (item.byMe || page.canEditAll) && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => setDialog({ kind: "edit", item })}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger-quiet"
                        loading={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const result = await actions.remove(item.id);
                            toast(result.ok ? "Question deleted" : result.error);
                            if (result.ok) router.refresh();
                          })
                        }
                      >
                        Delete
                      </Button>
                    </>
                  )
                }
              />
            </li>
          ))}
        </ol>
      )}

      {dialog?.kind === "write" && <WriteDialog page={page} initialPair={pair} save={actions.save} onClose={() => setDialog(null)} />}
      {dialog?.kind === "edit" && <EditDialog item={dialog.item} update={actions.update} onClose={() => setDialog(null)} />}
      {dialog?.kind === "generate" && <GenerateDialog page={page} initialPair={pair} actions={actions} onClose={() => setDialog(null)} />}
    </div>
  );
}

function PairSelect({ page, value, onChange }: { page: QuestionBankPage; value: string; onChange: (v: string) => void }) {
  return (
    <SelectField label="Subject and class" value={value} onChange={(e) => onChange(e.target.value)}>
      {page.pairs.map((p) => (
        <option key={pairKey(p)} value={pairKey(p)}>
          {p.levelName} {p.subjectName}
        </option>
      ))}
    </SelectField>
  );
}

function WriteDialog({ page, initialPair, save, onClose }: { page: QuestionBankPage; initialPair: string; save: BankActions["save"]; onClose: () => void }) {
  const router = useRouter();
  const [pair, setPair] = useState(initialPair || pairKey(page.pairs[0]!));
  const [question, setQuestion] = useState<Question>(blankQuestion("objective"));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const submit = () => {
    const checked = questionSchema.safeParse(question);
    if (!checked.success) {
      setErrors(errorsOf(checked.error.issues));
      return setFailure("Please check the highlighted fields.");
    }
    const [subjectId, levelId] = pair.split("|");
    startTransition(async () => {
      const result = await save({ subjectId, levelId, questions: [checked.data], source: "teacher" });
      if (!result.ok) return setFailure(result.error);
      toast("Question added to the bank");
      onClose();
      router.refresh();
    });
  };
  return (
    <ResponsiveDialog open onClose={onClose} laptop="panel" title="Write a question" footer={<Button className="w-full" loading={pending} onClick={submit}>Add to the bank</Button>}>
      <div className="grid gap-4">
        <PairSelect page={page} value={pair} onChange={setPair} />
        <QuestionEditor value={question} onChange={(q) => (setQuestion(q), setErrors({}))} errors={errors} />
        <FormError message={failure} />
      </div>
    </ResponsiveDialog>
  );
}

function EditDialog({ item, update, onClose }: { item: BankQuestion; update: BankActions["update"]; onClose: () => void }) {
  const router = useRouter();
  const [question, setQuestion] = useState<Question>(item.question);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const submit = () => {
    const checked = questionSchema.safeParse(question);
    if (!checked.success) {
      setErrors(errorsOf(checked.error.issues));
      return setFailure("Please check the highlighted fields.");
    }
    startTransition(async () => {
      const result = await update(item.id, checked.data);
      if (!result.ok) return setFailure(result.error);
      toast("Question saved");
      onClose();
      router.refresh();
    });
  };
  return (
    <ResponsiveDialog open onClose={onClose} laptop="panel" title="Edit the question" footer={<Button className="w-full" loading={pending} onClick={submit}>Save</Button>}>
      <div className="grid gap-4">
        <QuestionEditor value={question} onChange={(q) => (setQuestion(q), setErrors({}))} errors={errors} />
        <FormError message={failure} />
      </div>
    </ResponsiveDialog>
  );
}

type Counts = GenerateRequest["counts"];

function GenerateDialog({ page, initialPair, actions, onClose }: { page: QuestionBankPage; initialPair: string; actions: BankActions; onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState<"ask" | "wait" | "check">("ask");
  const [pair, setPair] = useState(initialPair || pairKey(page.pairs[0]!));
  const [purpose, setPurpose] = useState<GenerateRequest["purpose"]>("test");
  const [topics, setTopics] = useState("");
  const [notes, setNotes] = useState("");
  const [counts, setCounts] = useState<Counts>({ objective: 10, trueFalse: 0, fillGap: 0, theory: 2 });
  const [difficulty, setDifficulty] = useState<GenerateRequest["difficulty"]>("mixed");
  const [drafts, setDrafts] = useState<Question[]>([]);
  const [editing, setEditing] = useState<number | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [subjectId, levelId] = pair.split("|");

  const ask = () => {
    setFailure(null);
    setStep("wait");
    startTransition(async () => {
      const result = await actions.generate({
        purpose,
        subjectId,
        levelId,
        topics: topics.split(",").map((t) => t.trim()).filter(Boolean),
        notes,
        counts,
        difficulty,
      });
      if (!result.ok) {
        setStep("ask");
        return setFailure(result.error);
      }
      setDrafts(result.data.questions);
      setStep("check");
    });
  };

  const save = () =>
    startTransition(async () => {
      const result = await actions.save({ subjectId, levelId, questions: drafts, source: "ai" });
      if (!result.ok) return setFailure(result.error);
      toast(`${result.data.saved} questions added to the bank`);
      onClose();
      router.refresh();
    });

  const count = (key: keyof Counts, label: string) => (
    <TextField label={label} inputMode="numeric" value={String(counts[key])} onChange={(e) => setCounts((c) => ({ ...c, [key]: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))} />
  );

  return (
    <ResponsiveDialog
      open
      onClose={onClose}
      laptop="panel"
      width={560}
      title={step === "check" ? "Check the questions" : "Generate questions"}
      description={step === "check" ? "AI makes mistakes. Read each one, fix or remove it, then save the ones you’ll use." : "Say what the questions are about. You check every one before it’s saved."}
      footer={
        step === "ask" ? (
          <Button className="w-full" onClick={ask}>
            Generate
          </Button>
        ) : step === "check" ? (
          <Button className="w-full" loading={pending} disabled={!drafts.length} onClick={save}>
            Save {drafts.length === 1 ? "1 question" : `${drafts.length} questions`} to the bank
          </Button>
        ) : undefined
      }
    >
      {step === "ask" && (
        <div className="grid gap-4">
          <Alert tone="info">Sample questions for now: the real ones come from AI once the backend connects it.</Alert>
          <PairSelect page={page} value={pair} onChange={setPair} />
          <SelectField label="For" value={purpose} onChange={(e) => setPurpose(e.target.value as GenerateRequest["purpose"])}>
            <option value="test">A test</option>
            <option value="assignment">An assignment</option>
            <option value="exam">An exam</option>
          </SelectField>
          <TextField label="Topics" placeholder="e.g. Fractions, Decimals" hint="Separate topics with commas." value={topics} onChange={(e) => setTopics(e.target.value)} />
          <TextAreaField label="Anything else (optional)" rows={2} placeholder="e.g. Focus on word problems" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <fieldset className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <legend className="mb-2 text-sm font-medium">How many of each</legend>
            {count("objective", "Objective")}
            {count("trueFalse", "True or false")}
            {count("fillGap", "Fill in the gap")}
            {count("theory", "Theory")}
          </fieldset>
          <SelectField label="Difficulty" value={difficulty} onChange={(e) => setDifficulty(e.target.value as GenerateRequest["difficulty"])}>
            <option value="mixed">A mix</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </SelectField>
          <p className="text-[12.5px] text-text-secondary">
            Uses 1 of your school’s {page.usage.limit} generations this month ({page.usage.limit - page.usage.used} left).
          </p>
          <FormError message={failure} />
        </div>
      )}

      {step === "wait" && (
        <div role="status" className="grid place-items-center gap-3 py-16 text-center">
          <Spinner className="h-8 w-8" />
          <p className="font-semibold">Writing your questions…</p>
          <p className="text-sm text-text-secondary">This can take up to 40 seconds.</p>
        </div>
      )}

      {step === "check" && (
        <ol className="grid gap-3" aria-label="Draft questions">
          {drafts.map((q, i) => (
            <li key={i}>
              {editing === i ? (
                <div className="grid gap-3 rounded-2xl bg-surface p-4 shadow-raised">
                  <QuestionEditor value={q} onChange={(next) => setDrafts((all) => all.map((x, j) => (j === i ? next : x)))} />
                  <Button size="sm" className="justify-self-start" onClick={() => (questionSchema.safeParse(q).success ? setEditing(null) : toast("This question still needs fixing."))}>
                    Done
                  </Button>
                </div>
              ) : (
                <QuestionCard
                  question={q}
                  number={i + 1}
                  footer={
                    <>
                      <Button size="sm" variant="secondary" onClick={() => setEditing(i)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="danger-quiet" onClick={() => setDrafts((all) => all.filter((_, j) => j !== i))}>
                        Remove
                      </Button>
                    </>
                  }
                />
              )}
            </li>
          ))}
          <FormError message={failure} />
        </ol>
      )}
    </ResponsiveDialog>
  );
}
