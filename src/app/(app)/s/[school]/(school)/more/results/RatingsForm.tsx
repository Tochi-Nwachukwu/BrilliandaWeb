"use client";

import { DEFAULT_TRAITS, RATING_LABELS, ratingSettingsSchema, type RatingSettings } from "@brillianda/core/results";
import { Button } from "@brillianda/ui/Button";
import { Card } from "@brillianda/ui/Cards";
import { TextField } from "@brillianda/ui/TextField";
import { toast } from "@brillianda/ui/Toast";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormError } from "@/components/auth/FormError";
import type { ActionResult } from "@/data/types";
import { firstErrors, type Errors } from "@/lib/form";
import { errorsFor } from "@/lib/formCheck";

/** Behaviour ratings on report cards (batch 15): optional, and each school chooses its traits. */
export function RatingsForm({ settings, save }: { settings: RatingSettings; save: (input: unknown) => Promise<ActionResult<null>> }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(settings.enabled);
  const [traits, setTraits] = useState(settings.traits.length ? settings.traits : DEFAULT_TRAITS);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = () => {
    setFailure(null);
    const input = { enabled, traits: traits.map((t) => t.trim()).filter(Boolean) };
    const problems = errorsFor(ratingSettingsSchema, input);
    if (problems) {
      setErrors(problems);
      return setFailure(problems.traits ?? "Please check the traits.");
    }
    startTransition(async () => {
      const result = await save(input);
      if (!result.ok) {
        setErrors(firstErrors(result.fieldErrors));
        return setFailure(result.error);
      }
      toast("Behaviour ratings saved");
      router.refresh();
    });
  };

  return (
    <Card title="Behaviour ratings" description={`Optional. The form teacher rates each trait from 1 to 5 (${RATING_LABELS.join(", ")}), and it shows on the report card.`}>
      <div className="grid gap-4">
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
          <b className="font-medium">Rate behaviour on report cards</b>
        </label>
        {enabled && (
          <>
            <ol className="grid gap-3 sm:grid-cols-2">
              {traits.map((t, i) => (
                <li key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
                  <TextField label={`Trait ${i + 1}`} value={t} onChange={(e) => setTraits((all) => all.map((x, j) => (j === i ? e.target.value : x)))} error={errors[`traits.${i}`]} />
                  <Button type="button" size="sm" variant="danger-quiet" className="mb-1" onClick={() => setTraits((all) => all.filter((_, j) => j !== i))}>
                    Remove
                  </Button>
                </li>
              ))}
            </ol>
            {traits.length < 12 && (
              <Button type="button" size="sm" variant="secondary" className="justify-self-start" onClick={() => setTraits((all) => [...all, ""])}>
                Add a trait
              </Button>
            )}
          </>
        )}
        <FormError message={failure} />
        <Button className="justify-self-start" loading={pending} onClick={submit}>
          Save ratings
        </Button>
      </div>
    </Card>
  );
}
