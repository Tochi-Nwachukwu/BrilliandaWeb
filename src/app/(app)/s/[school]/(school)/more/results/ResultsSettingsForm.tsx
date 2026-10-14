"use client";

import { DEFAULT_SCALE, resultsSettingsSchema, WAEC_SCALE } from "@brillianda/core/results";
import { Alert } from "@brillianda/ui/Alert";
import { Button } from "@brillianda/ui/Button";
import { Card } from "@brillianda/ui/Cards";
import { TextField } from "@brillianda/ui/TextField";
import { toast } from "@brillianda/ui/Toast";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormError } from "@/components/auth/FormError";
import type { ActionResult, ResultsSettingsData } from "@/data/types";
import { firstErrors, type Errors } from "@/lib/form";
import { errorsFor } from "@/lib/formCheck";

type Band = ResultsSettingsData["scale"][number];

/** More › Results settings (batch 14): score parts, the grading scale, and positions. */
export function ResultsSettingsForm({ settings, save }: { settings: ResultsSettingsData; save: (input: unknown) => Promise<ActionResult<null>> }) {
  const router = useRouter();
  const [components, setComponents] = useState(settings.components.map((c) => ({ ...c, maxScore: String(c.maxScore) })));
  const [scale, setScale] = useState(settings.scale.map((b) => ({ ...b, minScore: String(b.minScore) })));
  const [showPositions, setShowPositions] = useState(settings.showPositions);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [nextId, setNextId] = useState(1);
  const total = components.reduce((n, c) => n + (Number(c.maxScore) || 0), 0);
  const locked = settings.scoresEntered;

  const applyPreset = (bands: Band[]) => setScale(bands.map((b) => ({ ...b, minScore: String(b.minScore) })));
  const submit = () => {
    setFailure(null);
    const input = { components, scale, showPositions };
    const problems = errorsFor(resultsSettingsSchema, input);
    if (problems) {
      setErrors(problems);
      return setFailure(problems.components ?? problems.scale ?? "Please check the highlighted fields.");
    }
    startTransition(async () => {
      const result = await save(input);
      if (!result.ok) {
        setErrors(firstErrors(result.fieldErrors));
        return setFailure(result.error);
      }
      toast("Results settings saved");
      router.refresh();
    });
  };

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Card title="Score parts" description={`Each part’s marks count towards 100. These add up to ${total}.`}>
        {locked && <Alert tone="info">Scores are already in for this term, so parts and their marks can’t change until next term. You can still rename them.</Alert>}
        <ol className="mt-3 grid gap-3">
          {components.map((c, i) => (
            <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_6rem_auto] items-end gap-3">
              <TextField label="Name" value={c.name} onChange={(e) => setComponents((all) => all.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} error={errors[`components.${i}.name`]} />
              <TextField label="Marks" inputMode="numeric" value={c.maxScore} disabled={locked} onChange={(e) => setComponents((all) => all.map((x, j) => (j === i ? { ...x, maxScore: e.target.value } : x)))} error={errors[`components.${i}.maxScore`]} />
              <Button type="button" size="sm" variant="danger-quiet" disabled={locked || components.length === 1} onClick={() => setComponents((all) => all.filter((_, j) => j !== i))} className="mb-1">
                Remove
              </Button>
            </li>
          ))}
        </ol>
        {!locked && components.length < 8 && (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="mt-3"
            onClick={() => {
              setComponents((all) => [...all, { id: `part-${Date.now()}-${nextId}`, name: `CA${all.length}`, maxScore: "10" }]);
              setNextId((n) => n + 1);
            }}
          >
            Add a part
          </Button>
        )}
      </Card>

      <Card title="Grades" description="A total gets the highest grade it reaches. The last grade must start at 0.">
        <div className="mb-3 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => applyPreset(DEFAULT_SCALE)}>
            Use A to F
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => applyPreset(WAEC_SCALE)}>
            Use WAEC style (A1 to F9)
          </Button>
        </div>
        <ol className="grid gap-3">
          {scale.map((b, i) => (
            <li key={i} className="grid grid-cols-[5rem_5rem_minmax(0,1fr)] items-end gap-3 sm:grid-cols-[5rem_5rem_minmax(0,1fr)_auto_auto]">
              <TextField label="From" inputMode="decimal" value={b.minScore} onChange={(e) => setScale((all) => all.map((x, j) => (j === i ? { ...x, minScore: e.target.value } : x)))} error={errors[`scale.${i}.minScore`]} />
              <TextField label="Grade" value={b.grade} onChange={(e) => setScale((all) => all.map((x, j) => (j === i ? { ...x, grade: e.target.value } : x)))} error={errors[`scale.${i}.grade`]} />
              <TextField label="Remark" value={b.remark} onChange={(e) => setScale((all) => all.map((x, j) => (j === i ? { ...x, remark: e.target.value } : x)))} />
              <label className="mb-3 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={b.isPass} onChange={(e) => setScale((all) => all.map((x, j) => (j === i ? { ...x, isPass: e.target.checked } : x)))} className="h-4 w-4 accent-[var(--color-accent)]" />
                Pass
              </label>
              <Button type="button" size="sm" variant="danger-quiet" disabled={scale.length <= 2} onClick={() => setScale((all) => all.filter((_, j) => j !== i))} className="mb-1">
                Remove
              </Button>
            </li>
          ))}
        </ol>
        {scale.length < 12 && (
          <Button type="button" size="sm" variant="secondary" className="mt-3" onClick={() => setScale((all) => [...all, { minScore: "", grade: "", remark: "", isPass: true }])}>
            Add a grade
          </Button>
        )}
      </Card>

      <Card title="Positions">
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={showPositions} onChange={(e) => setShowPositions(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]" />
          <span>
            <b className="block font-medium">Show each student’s position in their class</b>
            <span className="text-text-secondary">Ranked within the arm, like 3rd of 30 in JSS 1 Blue. Equal averages share a position: 1, 2, 2, 4.</span>
          </span>
        </label>
      </Card>

      <FormError message={failure} />
      <div>
        <Button type="submit" loading={pending}>
          Save settings
        </Button>
      </div>
    </form>
  );
}
