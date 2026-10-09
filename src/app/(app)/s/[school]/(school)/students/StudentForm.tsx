"use client";

import { GENDER_LABEL, GENDERS, NIGERIAN_STATES, studentSchema } from "@brillianda/core";
import { Alert, Button, Card, SelectField, TextField, cx, toast } from "@brillianda/ui";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { FormError, useFocusOnFailure } from "@/components/auth/FormError";
import { errorsFor, firstErrors, type Errors } from "@/lib/form";
import type { ActionResult, ArmOption, GuardianMatch } from "@/data/types";
import { ArmOptions } from "./StudentsView";

export type StudentValues = {
  firstName: string;
  lastName: string;
  otherNames: string;
  gender: string;
  armId: string;
  dateOfBirth: string;
  admissionNo: string;
  admissionDate: string;
  address: string;
  stateOfOrigin: string;
  guardianId: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
};

export const blankStudent = (armId = ""): StudentValues => ({
  firstName: "",
  lastName: "",
  otherNames: "",
  gender: "",
  armId,
  dateOfBirth: "",
  admissionNo: "",
  admissionDate: "",
  address: "",
  stateOfOrigin: "",
  guardianId: "",
  guardianName: "",
  guardianPhone: "",
  guardianEmail: "",
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card title={title}>
      <div className="grid gap-4 md:grid-cols-2">{children}</div>
    </Card>
  );
}

/** Adding or editing one student (plan: "Adding one student"). One column on a phone, sticky Save. */
export function StudentForm({
  arms,
  initial,
  nextAdmissionNo,
  mode,
  save,
  findGuardian,
  onSaved,
  linkedGuardian,
}: {
  arms: ArmOption[];
  initial: StudentValues;
  nextAdmissionNo?: string;
  mode: "add" | "edit";
  save: (input: unknown) => Promise<ActionResult<{ id: string; admissionNo: string; fullName: string } | null>>;
  findGuardian: (phone: string) => Promise<GuardianMatch | null>;
  /** After a save: the new student's id (add) or nothing (edit), and whether to add another. */
  onSaved: (result: { id?: string; another: boolean }) => void;
  /** Editing a student whose guardian is shared with siblings. */
  linkedGuardian?: { name: string; siblings: number } | null;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [match, setMatch] = useState<GuardianMatch | null>(null);
  const [linked, setLinked] = useState<{ name: string; detail: string } | null>(linkedGuardian ? { name: linkedGuardian.name, detail: linkedGuardian.siblings ? `Shared with ${linkedGuardian.siblings} ${linkedGuardian.siblings === 1 ? "sibling" : "siblings"}` : "" } : null);
  const [pending, startTransition] = useTransition();
  useFocusOnFailure(formRef, attempt);

  const set = (field: keyof StudentValues) => (value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const lookUp = () => {
    if (values.guardianId || !values.guardianPhone.trim()) return;
    startTransition(async () => setMatch(await findGuardian(values.guardianPhone)));
  };

  const submit = (another: boolean) => {
    setFailure(null);
    const problems = errorsFor(studentSchema, values);
    if (problems) {
      setErrors(problems);
      setAttempt((n) => n + 1);
      return;
    }
    startTransition(async () => {
      const result = await save(values);
      if (!result.ok) {
        setErrors(firstErrors(result.fieldErrors));
        setFailure(result.fieldErrors ? null : result.error);
        setAttempt((n) => n + 1);
        return;
      }
      if (result.data) toast(`Added ${result.data.fullName}, ${result.data.admissionNo}`);
      else toast("Saved");
      if (another) {
        // Keep the class for the next child (plan: Save and add another).
        setValues(blankStudent(values.armId));
        setLinked(null);
        setMatch(null);
        formRef.current?.querySelector<HTMLInputElement>("input")?.focus();
        router.refresh();
      }
      onSaved({ id: result.data?.id, another });
    });
  };

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit(false);
      }}
      className="grid gap-4 pb-40 md:pb-0"
    >
      <Section title="Student">
        <TextField label="First name" autoComplete="off" value={values.firstName} onChange={(e) => set("firstName")(e.target.value)} error={errors.firstName} />
        <TextField label="Last name" autoComplete="off" value={values.lastName} onChange={(e) => set("lastName")(e.target.value)} error={errors.lastName} />
        <TextField label="Other names (optional)" autoComplete="off" value={values.otherNames} onChange={(e) => set("otherNames")(e.target.value)} error={errors.otherNames} />
        <fieldset>
          <legend className="mb-1.5 block text-sm font-medium">Gender</legend>
          <div role="radiogroup" aria-invalid={errors.gender ? true : undefined} tabIndex={errors.gender ? -1 : undefined} className="grid grid-cols-2 gap-2">
            {GENDERS.map((g) => (
              <label
                key={g}
                className={cx(
                  "flex min-h-[46px] cursor-pointer items-center justify-center rounded-[14px] text-sm font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent",
                  values.gender === g ? "bg-accent-soft text-accent" : errors.gender ? "bg-danger-bg ring-2 ring-danger" : "bg-sunken hover:bg-hover",
                )}
              >
                <input type="radio" name="gender" className="sr-only" checked={values.gender === g} onChange={() => set("gender")(g)} />
                {GENDER_LABEL[g]}
              </label>
            ))}
          </div>
          {errors.gender && <p className="mt-1.5 text-sm text-danger">{errors.gender}</p>}
        </fieldset>
        <SelectField label="Class" value={values.armId} onChange={(e) => set("armId")(e.target.value)} error={errors.armId}>
          <option value="">Choose a class</option>
          <ArmOptions arms={arms} />
        </SelectField>
        <TextField label="Date of birth (optional)" type="date" value={values.dateOfBirth} onChange={(e) => set("dateOfBirth")(e.target.value)} error={errors.dateOfBirth} />
      </Section>

      <Section title="Admission">
        <TextField
          label="Admission number (optional)"
          autoComplete="off"
          placeholder={nextAdmissionNo}
          hint={mode === "add" && nextAdmissionNo ? `Leave it blank and they get ${nextAdmissionNo}.` : undefined}
          value={values.admissionNo}
          onChange={(e) => set("admissionNo")(e.target.value)}
          error={errors.admissionNo}
        />
        <TextField label="Admission date (optional)" type="date" hint={mode === "add" ? "Today if left blank." : undefined} value={values.admissionDate} onChange={(e) => set("admissionDate")(e.target.value)} error={errors.admissionDate} />
      </Section>

      <Section title="Guardian (optional)">
        {linked ? (
          <div className="md:col-span-2">
            <Alert
              tone="success"
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setLinked(null);
                    setValues((v) => ({ ...v, guardianId: "" }));
                  }}
                >
                  {mode === "add" ? "Unlink" : "Change"}
                </Button>
              }
            >
              <b className="font-semibold">{linked.name}</b>
              {linked.detail && <span className="text-text-secondary"> · {linked.detail}</span>}
            </Alert>
          </div>
        ) : (
          <>
            <TextField
              label="Guardian phone"
              type="tel"
              inputMode="tel"
              placeholder="0803 000 0001"
              hint="If siblings are already here, we’ll find their guardian."
              value={values.guardianPhone}
              onChange={(e) => {
                set("guardianPhone")(e.target.value);
                setMatch(null);
              }}
              onBlur={lookUp}
              error={errors.guardianPhone}
            />
            <TextField label="Guardian name" value={values.guardianName} onChange={(e) => set("guardianName")(e.target.value)} error={errors.guardianName} />
            <TextField label="Guardian email" type="email" autoCapitalize="none" value={values.guardianEmail} onChange={(e) => set("guardianEmail")(e.target.value)} error={errors.guardianEmail} />
            {match && (
              <div className="md:col-span-2">
                <Alert
                  tone="info"
                  action={
                    <Button
                      size="sm"
                      onClick={() => {
                        setValues((v) => ({ ...v, guardianId: match.id, guardianName: "", guardianEmail: "" }));
                        setLinked({ name: match.name, detail: `guardian of ${match.children.join(", ")}` });
                        setMatch(null);
                      }}
                    >
                      Link
                    </Button>
                  }
                >
                  This number belongs to <b className="font-semibold">{match.name}</b>, guardian of {match.children.join(", ")}. Link this student to them?
                </Alert>
              </div>
            )}
          </>
        )}
      </Section>

      <Section title="More (optional)">
        <TextField label="Address" value={values.address} onChange={(e) => set("address")(e.target.value)} error={errors.address} />
        <SelectField label="State of origin" value={values.stateOfOrigin} onChange={(e) => set("stateOfOrigin")(e.target.value)} error={errors.stateOfOrigin}>
          <option value="">Not given</option>
          {NIGERIAN_STATES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </SelectField>
      </Section>

      {/* Phone: Save stays in view above the tab bar. Laptop: at the end of the form. */}
      <div className="fixed inset-x-3 bottom-[92px] z-20 grid gap-2 rounded-[22px] bg-[color-mix(in_oklab,var(--color-surface)_94%,transparent)] p-3 shadow-float backdrop-blur-md md:static md:bg-transparent md:p-0 md:shadow-none md:backdrop-blur-none">
        <FormError message={failure} />
        <div className="flex flex-wrap justify-end gap-2 [&>*]:max-md:flex-1">
          {mode === "add" && (
            <Button variant="secondary" loading={pending} onClick={() => submit(true)}>
              Save and add another
            </Button>
          )}
          <Button type="submit" loading={pending}>
            Save
          </Button>
        </div>
      </div>
    </form>
  );
}
