"use client";

import { QUESTION_TYPE_LABEL, totalMarks } from "@brillianda/core/questions";
import { Button } from "@brillianda/ui/Button";
import { Card } from "@brillianda/ui/Cards";
import { EmptyState } from "@brillianda/ui/EmptyState";
import { SelectField, TextAreaField, TextField } from "@brillianda/ui/TextField";
import { useState } from "react";
import type { QuestionBankPage } from "@/data/types";
import { Paper } from "./Paper";

const pairKey = (p: { subjectId: string; levelId: string }) => `${p.subjectId}|${p.levelId}`;

/** Printing a question paper from the bank (batch 26): choose, preview, print or save as PDF. */
export function PaperBuilder({ page, schoolName }: { page: QuestionBankPage; schoolName: string }) {
  const [pair, setPair] = useState(page.pairs[0] ? pairKey(page.pairs[0]) : "");
  const current = page.pairs.find((p) => pairKey(p) === pair);
  const bank = page.questions.filter((q) => pairKey(q) === pair);
  const [chosen, setChosen] = useState<string[]>([]);
  const [title, setTitle] = useState("First Term Examination");
  const [timeAllowed, setTimeAllowed] = useState("1 hour 30 minutes");
  const [instructions, setInstructions] = useState("Answer all questions in Section A and any three in Section B.");
  const [versions, setVersions] = useState(1);
  const [answerKey, setAnswerKey] = useState(true);
  const [preview, setPreview] = useState(false);
  const questions = bank.filter((q) => chosen.includes(q.id)).map((q) => q.question);

  if (!page.pairs.length) return <EmptyState title="No subjects yet">Papers come from the question bank of the subjects and classes you teach.</EmptyState>;

  if (preview && current) {
    return (
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Button variant="secondary" onClick={() => setPreview(false)}>
            Back to the choices
          </Button>
          <Button onClick={() => window.print()}>Print or save as PDF</Button>
          <span className="text-[12.5px] text-text-secondary">Each version and the answer key start on a new page.</span>
        </div>
        <Paper setup={{ schoolName, title, subjectName: current.subjectName, levelName: current.levelName, timeAllowed, instructions, questions, versions, answerKey }} />
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-start">
      <Card title="The paper">
        <div className="grid gap-4">
          <SelectField
            label="Subject and class"
            value={pair}
            onChange={(e) => {
              setPair(e.target.value);
              setChosen([]);
            }}
          >
            {page.pairs.map((p) => (
              <option key={pairKey(p)} value={pairKey(p)}>
                {p.levelName} {p.subjectName}
              </option>
            ))}
          </SelectField>
          <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextField label="Time allowed" value={timeAllowed} onChange={(e) => setTimeAllowed(e.target.value)} />
          <TextAreaField label="Instructions" rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          <SelectField label="Versions" hint="Different orders of questions and options, so neighbours can’t copy." value={String(versions)} onChange={(e) => setVersions(Number(e.target.value))}>
            <option value="1">One version</option>
            <option value="2">Two: A and B</option>
            <option value="3">Three: A, B and C</option>
          </SelectField>
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={answerKey} onChange={(e) => setAnswerKey(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
            Add the answer key and marking guide, on its own page
          </label>
          <Button className="justify-self-start" disabled={!questions.length || !title.trim()} onClick={() => setPreview(true)}>
            Preview the paper
          </Button>
        </div>
      </Card>

      <Card title="Questions" description={`${questions.length} chosen · ${totalMarks(questions)} marks`}>
        {bank.length === 0 ? (
          <p className="text-sm text-text-secondary">No questions in this subject’s bank yet.</p>
        ) : (
          <div className="grid gap-2">
            <Button size="sm" variant="secondary" className="justify-self-start" onClick={() => setChosen(chosen.length === bank.length ? [] : bank.map((q) => q.id))}>
              {chosen.length === bank.length ? "Choose none" : `Choose all ${bank.length}`}
            </Button>
            <ul className="grid gap-1.5" aria-label="Questions to choose from">
              {bank.map((q) => (
                <li key={q.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-sunken p-3 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent">
                    <input
                      type="checkbox"
                      checked={chosen.includes(q.id)}
                      onChange={(e) => setChosen((all) => (e.target.checked ? [...all, q.id] : all.filter((x) => x !== q.id)))}
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
          </div>
        )}
      </Card>
    </div>
  );
}
