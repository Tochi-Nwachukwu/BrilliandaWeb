"use client";

import { defaultTerms, sessionSchema, TERM_NAME_PRESETS, type Term, type TermNamePreset } from "@brillianda/core/calendar";
import { sessionName } from "@brillianda/core/signup";
import { Button } from "@brillianda/ui/Button";
import { Card } from "@brillianda/ui/Cards";
import { cx } from "@brillianda/ui/cx";
import { SelectField, TextField } from "@brillianda/ui/TextField";
import { toast } from "@brillianda/ui/Toast";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { FormError } from "@/components/auth/FormError";
import { errorsFor } from "@/lib/formCheck";
import { firstErrors, type Errors } from "@/lib/form";
import type { ActionResult, SessionSetup } from "@/data/types";

/** Change the session year, how many terms, their names and their dates. */
export function SessionForm({ session, save }: { session: SessionSetup; save: (input: unknown) => Promise<ActionResult<SessionSetup>> }) {
  const router = useRouter();
  const [startYear, setStartYear] = useState(session.startYear);
  const [terms, setTerms] = useState<Term[]>(session.terms);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // New suggested dates, keeping any names the school has typed.
  const resuggest = (year: number, count: 2 | 3) => {
    const fresh = defaultTerms(year, count);
    setTerms(fresh.map((t, i) => ({ ...t, name: terms[i]?.name ?? t.name })));
    setErrors({});
  };
  const applyPreset = (preset: TermNamePreset) => {
    setTerms((list) => list.map((t, i) => ({ ...t, name: TERM_NAME_PRESETS[preset].names[i]! })));
    setErrors({});
  };
  const setTerm = (index: number, field: keyof Term, value: string) => {
    setTerms((list) => list.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
    const key = `terms.${index}.${field}`;
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setFailure(null);
    const input = { startYear, terms };
    const problems = errorsFor(sessionSchema, input);
    if (problems) {
      setErrors(problems);
      setFailure("Please check the highlighted dates.");
      return;
    }
    startTransition(async () => {
      const result = await save(input);
      if (!result.ok) {
        setErrors(firstErrors(result.fieldErrors));
        setFailure(result.error);
        return;
      }
      toast(`${result.data.name} calendar saved`);
      router.refresh();
    });
  };

  const years = [session.startYear - 1, session.startYear, session.startYear + 1];
  const count = terms.length as 2 | 3;

  return (
    <Card title="Change the calendar" description="Your own dates, names and number of terms. Every school’s calendar is a little different.">
      <form onSubmit={submit} className="grid gap-5" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Session"
            value={startYear}
            onChange={(e) => {
              const year = Number(e.target.value);
              setStartYear(year);
              resuggest(year, count);
            }}
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {sessionName(year)}
              </option>
            ))}
          </SelectField>
          <div>
            <span className="mb-1.5 block text-sm font-medium" id="term-count">
              Terms in a session
            </span>
            <div role="group" aria-labelledby="term-count" className="inline-flex rounded-full bg-sunken p-1">
              {([3, 2] as const).map((n) => (
                <button
                  key={n}
                  type="button"
                  aria-pressed={count === n}
                  onClick={() => n !== count && resuggest(startYear, n)}
                  className={cx(
                    "h-[38px] min-w-[64px] rounded-full px-4 text-sm font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent",
                    count === n ? "bg-raise text-text-primary shadow-raised" : "text-text-secondary hover:text-text-primary",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-text-secondary">Names:</span>
          {(Object.keys(TERM_NAME_PRESETS) as TermNamePreset[]).map((preset) => (
            <Button key={preset} size="sm" variant="secondary" onClick={() => applyPreset(preset)}>
              {TERM_NAME_PRESETS[preset].names.slice(0, count).map((n) => n.replace(" Term", "")).join(", ")}
            </Button>
          ))}
        </div>

        <ol className="grid gap-3">
          {terms.map((term, i) => (
            <li key={i}>
              <fieldset className="grid gap-3 rounded-2xl bg-sunken/60 p-4 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <legend className="sr-only">Term {i + 1}</legend>
                <TextField label={`Term ${i + 1} name`} value={term.name} onChange={(e) => setTerm(i, "name", e.target.value)} error={errors[`terms.${i}.name`]} />
                <TextField label="Starts" type="date" value={term.startsOn} onChange={(e) => setTerm(i, "startsOn", e.target.value)} error={errors[`terms.${i}.startsOn`]} />
                <TextField label="Ends" type="date" value={term.endsOn} onChange={(e) => setTerm(i, "endsOn", e.target.value)} error={errors[`terms.${i}.endsOn`]} />
              </fieldset>
            </li>
          ))}
        </ol>

        <div>
          <FormError message={failure} />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" loading={pending}>
              {session.confirmed ? "Save changes" : "Save the calendar"}
            </Button>
            <Button variant="ghost" onClick={() => resuggest(startYear, count)}>
              Use suggested dates
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}
