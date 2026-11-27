"use client";

import { NIGERIAN_STATES } from "@brillianda/core/nigeria";
import { GENDER_LABEL, GENDERS, studentSchema } from "@brillianda/core/students";
import { Alert } from "@brillianda/ui/Alert";
import { Button } from "@brillianda/ui/Button";
import { Card } from "@brillianda/ui/Cards";
import { cx } from "@brillianda/ui/cx";
import { SelectField, TextField } from "@brillianda/ui/TextField";
import { toast } from "@brillianda/ui/Toast";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type ReactNode } from "react";
import { FormError, useFocusOnFailure } from "@/components/auth/FormError";
import { errorsFor } from "@/lib/formCheck";
import { firstErrors, type Errors } from "@/lib/form";
import type { NewStudentInvites } from "@/data/actions/invites";
import type { ActionResult, ArmOption, GuardianMatch } from "@/data/types";
import { ClassSelect } from "@/components/ClassSelect";

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
  invite,
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
  /** Adding only: sends the invites asked for under “Invite”, once the student is saved. */
  invite?: (studentId: string, input: { studentEmail?: string; guardian?: boolean }) => Promise<NewStudentInvites>;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [match, setMatch] = useState<GuardianMatch | null>(null);
  const [linked, setLinked] = useState<{ name: string; detail: string } | null>(linkedGuardian ? { name: linkedGuardian.name, detail: linkedGuardian.siblings ? `Shared with ${linkedGuardian.siblings} ${linkedGuardian.siblings === 1 ? "sibling" : "siblings"}` : "" } : null);
  const [studentEmail, setStudentEmail] = useState("");
  const [inviteGuardian, setInviteGuardian] = useState(false);
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
      // Invites asked for on this page go out now, and each says how it went.
      if (result.data && invite && (studentEmail.trim() || inviteGuardian)) {
        const sent = await invite(result.data.id, { studentEmail, guardian: inviteGuardian });
        const notes = [sent.student !== "none" && (sent.student === "sent" ? "Student invited" : `Student not invited: ${sent.student}`), sent.guardian !== "none" && (sent.guardian === "sent" ? "Guardian invited" : `Guardian not invited: ${sent.guardian}`)].filter(Boolean);
        if (notes.length) toast(notes.join(". "));
      }
      setStudentEmail("");
      setInviteGuardian(false);
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
        <ClassSelect label="Class" items={arms} value={values.armId} onChange={set("armId")} error={errors.armId} />
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

      {mode === "add" && invite && (
        <Section title="Invite (optional)">
          <TextField
            label="Student’s email"
            type="email"
            autoCapitalize="none"
            autoComplete="off"
            hint="We email the student a link to set a password for the student portal. Leave it blank to skip."
            value={studentEmail}
            onChange={(e) => setStudentEmail(e.target.value)}
          />
          <label className="flex items-start gap-3 self-start rounded-2xl bg-sunken p-3.5 text-sm md:mt-7">
            <input type="checkbox" className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent)]" checked={inviteGuardian} onChange={(e) => setInviteGuardian(e.target.checked)} />
            <span>
              <b className="block font-semibold">Invite the guardian to the parent app</b>
              <span className="text-text-secondary">{linked || values.guardianEmail.trim() ? "We email them a link when you save." : "Add the guardian’s email above first."}</span>
            </span>
          </label>
        </Section>
      )}

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
