"use client";

import { Button, ResponsiveDialog, SelectField, TextField } from "@brillianda/ui";
import { useState, useTransition, type ReactNode } from "react";
import { FormError } from "@/components/auth/FormError";
import { errorsFor, firstErrors, type Errors } from "@/lib/form";
import type { ActionResult } from "@/data/types";

export type Field = { key: string; label: string; initial: string; hint?: string; placeholder?: string; upper?: boolean; options?: { value: string; label: string }[] };

/** A small form in a dialog (a bottom sheet on phones): fields, checked with a core schema, then saved. */
export function FormDialog({
  title,
  description,
  fields,
  schema,
  submitLabel,
  submit,
  onClose,
  onDone,
  before,
  extra,
}: {
  title: string;
  description?: string;
  fields: Field[];
  schema: Parameters<typeof errorsFor>[0];
  submitLabel: string;
  submit: (input: unknown) => Promise<ActionResult<null>>;
  onClose: () => void;
  onDone: (values: Record<string, string>) => void;
  before?: ReactNode;
  extra?: ReactNode;
}) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.key, f.initial])));
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setFailure(null);
    const problems = errorsFor(schema, values);
    if (problems) return setErrors(problems);
    startTransition(async () => {
      const result = await submit(values);
      if (result.ok) return onDone(values);
      setErrors(firstErrors(result.fieldErrors));
      setFailure(result.fieldErrors ? null : result.error);
    });
  };

  return (
    <ResponsiveDialog
      open
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={pending} onClick={save}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {before}
        <form
          className="grid gap-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          {fields.map((field, i) =>
            field.options ? (
              <SelectField key={field.key} label={field.label} value={values[field.key]} onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))} error={errors[field.key]}>
                {field.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </SelectField>
            ) : (
              <TextField
                key={field.key}
                label={field.label}
                hint={field.hint}
                placeholder={field.placeholder}
                data-autofocus={i === 0 ? "" : undefined}
                value={values[field.key]}
                onChange={(e) => {
                  const value = field.upper ? e.target.value.toUpperCase().replace(/\s+/g, "") : e.target.value;
                  setValues((v) => ({ ...v, [field.key]: value }));
                  if (errors[field.key]) setErrors((er) => ({ ...er, [field.key]: undefined }));
                }}
                error={errors[field.key]}
              />
            ),
          )}
          <FormError message={failure} />
          <button type="submit" hidden />
        </form>
        {extra}
      </div>
    </ResponsiveDialog>
  );
}

