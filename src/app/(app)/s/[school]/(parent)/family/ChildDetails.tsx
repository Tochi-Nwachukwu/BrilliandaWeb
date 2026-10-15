"use client";

import { CORRECTABLE, CORRECTION_LABEL, type CorrectableField } from "@brillianda/core/corrections";
import { NIGERIAN_STATES } from "@brillianda/core/nigeria";
import { GENDER_LABEL, GENDERS, type StudentGender } from "@brillianda/core/students";
import { Badge } from "@brillianda/ui/Badge";
import { Button } from "@brillianda/ui/Button";
import { Card } from "@brillianda/ui/Cards";
import { ResponsiveDialog } from "@brillianda/ui/ResponsiveDialog";
import { SelectField, TextAreaField, TextField } from "@brillianda/ui/TextField";
import { toast } from "@brillianda/ui/Toast";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormError } from "@/components/auth/FormError";
import type { ActionResult, ChildDetails as Details, CorrectionRow } from "@/data/types";
import { formatDate, formatShortDate } from "@/lib/time";

const STATUS = { open: ["Waiting for the school", "warning"], approved: ["Corrected", "success"], declined: ["Not changed", "neutral"] } as const;

/** What the record says for a field, as text a parent reads. */
function shown(field: CorrectableField, value: string): string {
  if (!value) return "Not given";
  if (field === "dateOfBirth") return formatDate(value);
  if (field === "gender") return GENDER_LABEL[value as StudentGender] ?? value;
  return value;
}

function valueOf(details: Details, field: CorrectableField): string {
  if (field === "guardianPhone") return details.guardian?.phone ?? "";
  if (field === "guardianEmail") return details.guardian?.email ?? "";
  return details[field];
}

/** A child's record for their parent (batch 21), and asking the school to correct it. */
export function ChildDetails({ details, corrections, ask }: { details: Details; corrections: CorrectionRow[]; ask: (input: unknown) => Promise<ActionResult<null>> }) {
  const [asking, setAsking] = useState(false);
  const rows: [string, string][] = [
    ["Full name", [details.firstName, details.otherNames, details.lastName].filter(Boolean).join(" ")],
    ["Date of birth", shown("dateOfBirth", details.dateOfBirth)],
    ["Gender", shown("gender", details.gender)],
    ["State of origin", shown("stateOfOrigin", details.stateOfOrigin)],
    ["Home address", shown("address", details.address)],
    ["Admitted", details.admissionDate ? formatDate(details.admissionDate) : "Not given"],
  ];
  if (details.guardian) {
    rows.push(["Guardian", details.guardian.name], ["Guardian’s phone", details.guardian.phone ?? "Not given"], ["Guardian’s email", details.guardian.email ?? "Not given"]);
  }

  return (
    <Card
      title="Details"
      description="What the school has on record."
      action={
        <Button size="sm" variant="secondary" onClick={() => setAsking(true)}>
          Ask for a correction
        </Button>
      }
    >
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="text-[12.5px] text-text-secondary">{label}</dt>
            <dd className="break-words font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      {corrections.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-[13px] font-semibold text-text-secondary">Your correction requests</h3>
          <ul className="grid gap-2">
            {corrections.map((c) => (
              <li key={c.id} className="rounded-2xl bg-sunken p-3.5 text-sm">
                <p className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[12.5px] text-text-secondary">Asked {formatShortDate(new Date(c.at).toISOString().slice(0, 10))}</span>
                  <Badge tone={STATUS[c.status][1]}>{STATUS[c.status][0]}</Badge>
                </p>
                <ul className="mt-1.5 grid gap-0.5">
                  {c.changes.map((ch) => (
                    <li key={ch.field}>
                      <b className="font-medium">{CORRECTION_LABEL[ch.field]}:</b> {shown(ch.field, ch.to)}
                    </li>
                  ))}
                </ul>
                {c.status === "declined" && c.decided?.reason && <p className="mt-1.5 text-text-secondary">The school said: “{c.decided.reason}”</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {asking && <AskDialog details={details} ask={ask} onClose={() => setAsking(false)} />}
    </Card>
  );
}

function AskDialog({ details, ask, onClose }: { details: Details; ask: (input: unknown) => Promise<ActionResult<null>>; onClose: () => void }) {
  const router = useRouter();
  const fields = CORRECTABLE.filter((f) => details.guardian || (f !== "guardianPhone" && f !== "guardianEmail"));
  const [changes, setChanges] = useState<{ field: CorrectableField; value: string }[]>([{ field: "dateOfBirth", value: details.dateOfBirth }]);
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const unused = fields.filter((f) => !changes.some((c) => c.field === f));

  const update = (i: number, next: Partial<{ field: CorrectableField; value: string }>) => {
    setChanges((all) => all.map((c, j) => (j === i ? { ...c, ...next } : c)));
    setErrors({});
  };

  const submit = () => {
    setFailure(null);
    startTransition(async () => {
      const result = await ask({ changes, note });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        return setFailure(result.error);
      }
      toast("Sent. The school will check it and update the record.");
      onClose();
      router.refresh();
    });
  };

  return (
    <ResponsiveDialog
      open
      onClose={onClose}
      title="Ask for a correction"
      description="Say what the record should say. The school checks it before anything changes."
      footer={
        <Button className="w-full" loading={pending} onClick={submit}>
          Send to the school
        </Button>
      }
    >
      <div className="grid gap-5">
        {changes.map((change, i) => (
          <fieldset key={i} className="grid gap-3 rounded-2xl bg-surface p-3.5 shadow-raised">
            <legend className="sr-only">Correction {i + 1}</legend>
            <SelectField
              label="What needs correcting"
              value={change.field}
              onChange={(e) => {
                const field = e.target.value as CorrectableField;
                update(i, { field, value: valueOf(details, field) });
              }}
              error={errors[`changes.${i}.field`]?.[0]}
            >
              {fields
                .filter((f) => f === change.field || unused.includes(f))
                .map((f) => (
                  <option key={f} value={f}>
                    {CORRECTION_LABEL[f]}
                  </option>
                ))}
            </SelectField>
            <ValueInput field={change.field} value={change.value} onChange={(value) => update(i, { value })} error={errors[`changes.${i}.value`]?.[0]} />
            {changes.length > 1 && (
              <Button size="sm" variant="danger-quiet" className="justify-self-start" onClick={() => setChanges((all) => all.filter((_, j) => j !== i))}>
                Remove this one
              </Button>
            )}
          </fieldset>
        ))}
        {unused.length > 0 && (
          <Button size="sm" variant="secondary" className="justify-self-start" onClick={() => setChanges((all) => [...all, { field: unused[0]!, value: valueOf(details, unused[0]!) }])}>
            Correct something else too
          </Button>
        )}
        <TextAreaField label="Anything the school should know? (optional)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} error={errors.note?.[0]} />
        <FormError message={failure} />
      </div>
    </ResponsiveDialog>
  );
}

function ValueInput({ field, value, onChange, error }: { field: CorrectableField; value: string; onChange: (value: string) => void; error?: string }) {
  const label = "It should say";
  if (field === "gender") {
    return (
      <SelectField label={label} value={value} onChange={(e) => onChange(e.target.value)} error={error}>
        {GENDERS.map((g) => (
          <option key={g} value={g}>
            {GENDER_LABEL[g]}
          </option>
        ))}
      </SelectField>
    );
  }
  if (field === "stateOfOrigin") {
    return (
      <SelectField label={label} value={value} onChange={(e) => onChange(e.target.value)} error={error}>
        <option value="">Choose a state</option>
        {NIGERIAN_STATES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </SelectField>
    );
  }
  const type = field === "dateOfBirth" ? "date" : field === "guardianEmail" ? "email" : field === "guardianPhone" ? "tel" : "text";
  return <TextField label={label} type={type} inputMode={field === "guardianPhone" ? "tel" : undefined} value={value} onChange={(e) => onChange(e.target.value)} error={error} />;
}
