"use client";

import { admissionPatternProblems, formatAdmissionNo } from "@brillianda/core";
import { Alert, Button, Card, Stepper, TextField, toast } from "@brillianda/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult, AdmissionSettings } from "@/data/types";

/** The school's admission number format (plan: a prefix, the year and a running number). */
export function AdmissionForm({ settings, year, save }: { settings: AdmissionSettings; year: number; save: (input: unknown) => Promise<ActionResult<AdmissionSettings>> }) {
  const router = useRouter();
  const [pattern, setPattern] = useState(settings.pattern);
  const [digits, setDigits] = useState(settings.digits);
  const [pending, startTransition] = useTransition();
  const problems = admissionPatternProblems({ pattern, digits });
  const preview = problems.length ? null : formatAdmissionNo({ pattern, digits }, year, settings.next);

  return (
    <Card title="Format" description="New students get the next number automatically. Numbers already given, and imported ones, stay as they are.">
      <form
        className="grid gap-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (problems.length) return;
          startTransition(async () => {
            const result = await save({ pattern, digits });
            toast(result.ok ? "Admission numbers saved" : result.error);
            if (result.ok) router.refresh();
          });
        }}
      >
        <TextField
          label="Pattern"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          error={problems[0]}
          hint="{YEAR} is the year the session starts; {NUMBER} is the running number."
          autoCapitalize="characters"
          spellCheck={false}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-medium" id="digits">
            Digits in the number
          </span>
          <Stepper label="Digits in the number" value={digits} min={1} max={6} onChange={setDigits} />
        </div>
        <div aria-live="polite">
          {preview ? (
            <Alert tone="info">
              The next student gets <b className="font-semibold">{preview}</b>.
            </Alert>
          ) : (
            <Alert tone="warning">Fix the pattern to see the next number.</Alert>
          )}
        </div>
        <div>
          <Button type="submit" loading={pending} disabled={!!problems.length}>
            Save
          </Button>
        </div>
      </form>
    </Card>
  );
}
