"use client";

import { MONTHS, NIGERIAN_STATES, SCHOOL_LEVEL_LABEL, SCHOOL_LEVELS, schoolDetailsSchema, type SchoolDetails, type SchoolLevel } from "@brillianda/core";
import { Button, SelectField, TextField, cx } from "@brillianda/ui";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { FormError, useFocusOnFailure } from "@/components/auth/FormError";
import { saveSchoolDetails } from "@/data/actions/signup";
import { errorsFor, firstErrors, type Errors } from "@/lib/form";

/** Screen 1: the school's details, and when its first session on Brillianda starts. */
export function SchoolForm({ saved, defaultStart }: { saved: SchoolDetails | null; defaultStart: { month: number; year: number } }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState({
    schoolName: saved?.schoolName ?? "",
    levels: saved?.levels ?? ([] as SchoolLevel[]),
    state: saved?.state ?? "",
    phone: saved?.phone ? `0${saved.phone.slice(4)}` : "",
    sessionStartMonth: String(saved?.sessionStartMonth ?? defaultStart.month),
    sessionStartYear: String(saved?.sessionStartYear ?? defaultStart.year),
  });
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pending, startTransition] = useTransition();
  useFocusOnFailure(formRef, attempt);

  const set = (field: keyof typeof values) => (value: string | SchoolLevel[]) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };
  const toggleLevel = (level: SchoolLevel) =>
    set("levels")(values.levels.includes(level) ? values.levels.filter((l) => l !== level) : SCHOOL_LEVELS.filter((l) => l === level || values.levels.includes(l)));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setFailure(null);
    const problems = errorsFor(schoolDetailsSchema, values);
    if (problems) {
      setErrors(problems);
      setAttempt((n) => n + 1);
      return;
    }
    startTransition(async () => {
      const result = await saveSchoolDetails(values);
      if (result.ok) return router.push("/signup/account");
      setErrors(firstErrors(result.fieldErrors));
      setFailure(result.fieldErrors ? null : result.error);
      setAttempt((n) => n + 1);
    });
  };

  const years = [defaultStart.year - 1, defaultStart.year, defaultStart.year + 1];

  return (
    <form ref={formRef} onSubmit={submit} noValidate>
      <div className="space-y-5">
        <TextField
          label="School name"
          name="schoolName"
          autoComplete="organization"
          value={values.schoolName}
          onChange={(e) => set("schoolName")(e.target.value)}
          error={errors.schoolName}
        />

        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium">Levels you teach</legend>
          <div className="flex flex-wrap gap-2" aria-invalid={errors.levels ? true : undefined} tabIndex={errors.levels ? -1 : undefined}>
            {SCHOOL_LEVELS.map((level) => {
              const on = values.levels.includes(level);
              return (
                <label
                  key={level}
                  className={cx(
                    "inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent",
                    on ? "bg-accent-soft text-accent" : "bg-sunken text-text-secondary hover:bg-hover",
                  )}
                >
                  <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleLevel(level)} />
                  <span aria-hidden className={cx("grid h-[18px] w-[18px] place-items-center rounded-full", on ? "bg-accent text-primary-text" : "bg-surface")}>
                    {on && (
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12.5l4.5 4.5L19 7.5" />
                      </svg>
                    )}
                  </span>
                  {SCHOOL_LEVEL_LABEL[level]}
                </label>
              );
            })}
          </div>
          <p className={cx("mt-1.5 text-sm", errors.levels ? "text-danger" : "text-text-secondary")}>
            {errors.levels ?? "This sets your first and last class in setup. You can change it."}
          </p>
        </fieldset>

        <SelectField label="State" name="state" value={values.state} onChange={(e) => set("state")(e.target.value)} error={errors.state}>
          <option value="">Choose a state</option>
          {NIGERIAN_STATES.map((state) => (
            <option key={state}>{state}</option>
          ))}
        </SelectField>

        <TextField
          label="School phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0803 000 0001"
          value={values.phone}
          onChange={(e) => set("phone")(e.target.value)}
          error={errors.phone}
        />

        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium">When does your first session on Brillianda start?</legend>
          <div className="grid grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-2">
            <SelectField label="Month" className="[&>label]:sr-only" value={values.sessionStartMonth} onChange={(e) => set("sessionStartMonth")(e.target.value)} error={errors.sessionStartMonth}>
              {MONTHS.map((month, i) => (
                <option key={month} value={i + 1}>
                  {month}
                </option>
              ))}
            </SelectField>
            <SelectField label="Year" className="[&>label]:sr-only" value={values.sessionStartYear} onChange={(e) => set("sessionStartYear")(e.target.value)} error={errors.sessionStartYear}>
              {years.map((year) => (
                <option key={year}>{year}</option>
              ))}
            </SelectField>
          </div>
          <p className="mt-1.5 text-sm text-text-secondary">
            Usually September. Session {values.sessionStartYear}/{Number(values.sessionStartYear) + 1}; you can change the dates in setup.
          </p>
        </fieldset>
      </div>

      <div className="mt-8">
        <FormError message={failure} />
        <Button type="submit" size="lg" className="w-full" loading={pending}>
          {pending ? "Saving…" : "Continue"}
        </Button>
      </div>
    </form>
  );
}
