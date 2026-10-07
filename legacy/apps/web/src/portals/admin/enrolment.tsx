import { useState, type FormEvent } from "react";
import type { AdminStudent, ArmSummary, Gender, StudentRecord, StudentStatus } from "@brillanda/shared-types";
import { fieldError, generalError } from "../../shared/auth/LoginPage";
import { Alert } from "../../shared/components/Alert";
import { Button } from "../../shared/components/Button";
import { Icon } from "../../shared/components/Icon";
import { Dialog } from "../../shared/components/Overlay";
import { PageSpinner } from "../../shared/components/Spinner";
import { SelectField, TextAreaField, TextField } from "../../shared/components/TextField";
import { toast } from "../../shared/components/Toast";
import { cx } from "../../shared/utils/cx";
import { formatDate } from "../../shared/utils/time";
import { SECTIONS, useAdmissionNumbers, useArms, useEnrolStudent, useInviteParent, useLeaveSchool, useUpdateStudent } from "./api";

// Enrolling one student, and their record: details, moving class, leaving and coming back
// (DECISIONS.md F-40). Everything a student did stays on their record after they leave.

const today = () => new Date().toISOString().slice(0, 10);
const firstName = (fullName: string) => fullName.split(" ")[0]!;

export const LEFT_LABEL: Record<Exclude<StudentStatus, "ACTIVE">, { title: string; detail: string }> = {
  WITHDRAWN: { title: "Withdrawn", detail: "Left the school, for any reason other than the two below." },
  TRANSFERRED: { title: "Transferred", detail: "Moved to another school." },
  GRADUATED: { title: "Graduated", detail: "Finished their final year." },
};

/** "Withdrawn 12 September 2026", for a student who has left. */
export const leftSummary = (student: Pick<StudentRecord, "status" | "left">) =>
  student.status === "ACTIVE" || !student.left ? null : `${LEFT_LABEL[student.status].title} ${formatDate(student.left.on)}`;

type Draft = {
  fullName: string;
  gender: "" | Gender;
  dob: string;
  armId: string;
  admissionNo: string;
  joinedOn: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  invite: boolean;
};

const blank = (armId = "", joinedOn = today()): Draft => ({ fullName: "", gender: "", dob: "", armId, admissionNo: "", joinedOn, guardianName: "", guardianPhone: "", guardianEmail: "", invite: true });

const fromRecord = (s: StudentRecord): Draft => ({
  fullName: s.fullName,
  gender: s.gender ?? "",
  dob: s.dob ?? "",
  armId: s.armId,
  admissionNo: s.admissionNo,
  joinedOn: s.joinedOn,
  guardianName: s.guardian.name ?? "",
  guardianPhone: s.guardian.phone ?? "",
  guardianEmail: s.guardian.email ?? "",
  invite: false,
});

const toBody = (d: Draft) => ({
  fullName: d.fullName,
  gender: d.gender || null,
  dob: d.dob || null,
  armId: d.armId,
  joinedOn: d.joinedOn,
  guardian: { name: d.guardianName || null, phone: d.guardianPhone || null, email: d.guardianEmail || null },
});

/** Classes grouped as junior and senior secondary, for a class picker. */
function ArmOptions({ arms }: { arms: ArmSummary[] }) {
  return (
    <>
      {SECTIONS.map((section) => (
        <optgroup key={section.id} label={section.name}>
          {arms.filter((a) => (section.orders as readonly number[]).includes(a.classOrder)).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </optgroup>
      ))}
    </>
  );
}

function StudentFields({ draft, set, error, arms, admissionHint, enrolling }: { draft: Draft; set: (patch: Partial<Draft>) => void; error: unknown; arms: ArmSummary[]; admissionHint: string; enrolling: boolean }) {
  return (
    <div className="grid gap-4">
      <TextField label="Full name" value={draft.fullName} onChange={(e) => set({ fullName: e.target.value })} placeholder="e.g. Chidera Okafor" data-autofocus autoComplete="off" error={fieldError(error, "fullName")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Class" value={draft.armId} onChange={(e) => set({ armId: e.target.value })} error={fieldError(error, "armId")}>
          <option value="" disabled>Choose a class</option>
          <ArmOptions arms={arms} />
        </SelectField>
        <TextField label="Admission number" value={draft.admissionNo} onChange={(e) => set({ admissionNo: e.target.value })} autoComplete="off" spellCheck={false} error={fieldError(error, "admissionNo")} hint={admissionHint} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <SelectField label="Gender" value={draft.gender} onChange={(e) => set({ gender: e.target.value as Draft["gender"] })} error={fieldError(error, "gender")}>
          <option value="">Not given</option>
          <option value="FEMALE">Female</option>
          <option value="MALE">Male</option>
        </SelectField>
        <TextField label="Date of birth" type="date" value={draft.dob} max={today()} onChange={(e) => set({ dob: e.target.value })} error={fieldError(error, "dob")} />
        <TextField label={enrolling ? "Joins on" : "Joined on"} type="date" value={draft.joinedOn} max={today()} onChange={(e) => set({ joinedOn: e.target.value })} error={fieldError(error, "joinedOn")} />
      </div>
      <fieldset className="grid gap-4">
        <legend className="mb-1 text-sm font-semibold">Parent or guardian</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Name" value={draft.guardianName} onChange={(e) => set({ guardianName: e.target.value })} placeholder="e.g. Mrs Bola Okafor" autoComplete="off" error={fieldError(error, "guardian.name")} />
          <TextField label="Phone" type="tel" inputMode="tel" value={draft.guardianPhone} onChange={(e) => set({ guardianPhone: e.target.value })} autoComplete="off" error={fieldError(error, "guardian.phone")} />
        </div>
        <TextField label="Email" type="email" value={draft.guardianEmail} onChange={(e) => set({ guardianEmail: e.target.value })} autoCapitalize="none" spellCheck={false} autoComplete="off" error={fieldError(error, "guardian.email")} hint={enrolling ? undefined : "Changing it here doesn't send a new invite."} />
        {enrolling && (
          <label className="flex cursor-pointer items-start gap-2.5 text-sm">
            <input type="checkbox" className="mt-0.5 h-[18px] w-[18px] accent-[var(--color-accent)]" checked={draft.invite && !!draft.guardianEmail} disabled={!draft.guardianEmail} onChange={(e) => set({ invite: e.target.checked })} />
            <span>
              Email them an invite to see results
              <span className="block text-[13px] text-text-secondary">{draft.guardianEmail ? "They'll get a link to set a password." : "Add an email to send one. No email? Print an access code later."}</span>
            </span>
          </label>
        )}
      </fieldset>
    </div>
  );
}

export function EnrolDialog({ open, onClose, onEnrolled }: { open: boolean; onClose: () => void; onEnrolled?: (student: StudentRecord) => void }) {
  if (!open) return null;
  return <EnrolForm onClose={onClose} onEnrolled={onEnrolled} />;
}

function EnrolForm({ onClose, onEnrolled }: { onClose: () => void; onEnrolled?: (student: StudentRecord) => void }) {
  const arms = useArms();
  const numbers = useAdmissionNumbers();
  const enrol = useEnrolStudent();
  const [draft, setDraft] = useState<Draft>(() => blank());
  const [another, setAnother] = useState(false);
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    enrol.mutate(
      { ...toBody(draft), admissionNo: draft.admissionNo || null, inviteParent: draft.invite && !!draft.guardianEmail },
      {
        onSuccess: ({ student, parentInvited }) => {
          toast(`${firstName(student.fullName)} is enrolled in ${student.armName} as ${student.admissionNo}${parentInvited ? ". Invite sent" : ""}`);
          onEnrolled?.(student);
          if (another) {
            enrol.reset();
            setDraft(blank(draft.armId, draft.joinedOn));
          } else onClose();
        },
      },
    );
  };

  return (
    <Dialog open onClose={onClose} width={620} title="Enrol a student" description="Only their name and class are needed now. Everything else can be added later.">
      {arms.isPending ? (
        <PageSpinner />
      ) : arms.error ? (
        <Alert tone="danger">{arms.error.message}</Alert>
      ) : (
        <form onSubmit={submit} className="grid gap-5" noValidate>
          <StudentFields
            key={enrol.submittedAt}
            draft={draft}
            set={set}
            error={enrol.error}
            arms={arms.data}
            enrolling
            admissionHint={numbers.data?.preview ? `Leave it blank to give them ${numbers.data.preview}.` : "Leave it blank to give them the next number."}
          />
          {generalError(enrol.error) && <Alert tone="danger">{generalError(enrol.error)}</Alert>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="secondary" loading={enrol.isPending && another} disabled={enrol.isPending} onClick={() => setAnother(true)}>Enrol and add another</Button>
            <Button type="submit" loading={enrol.isPending && !another} disabled={enrol.isPending} onClick={() => setAnother(false)}>Enrol student</Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

export function EditStudentDialog({ student, onClose }: { student: StudentRecord; onClose: () => void }) {
  const arms = useArms();
  const update = useUpdateStudent();
  const [draft, setDraft] = useState<Draft>(() => fromRecord(student));
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const moving = draft.armId !== student.armId;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    update.mutate({ id: student.id, ...toBody(draft), admissionNo: draft.admissionNo }, {
      onSuccess: (saved) => {
        toast(moving ? `${firstName(saved.fullName)} moved to ${saved.armName}, with their scores` : "Details saved");
        onClose();
      },
    });
  };

  return (
    <Dialog open onClose={onClose} width={620} title={`Edit ${firstName(student.fullName)}'s details`}>
      {arms.isPending ? (
        <PageSpinner />
      ) : (
        <form onSubmit={submit} className="grid gap-5" noValidate>
          <StudentFields draft={draft} set={set} error={update.error} arms={arms.data ?? []} enrolling={false} admissionHint="Must be different from every other student's." />
          {moving && <Alert tone="info">Moving class takes this term's scores with them. Their old class's positions are worked out again.</Alert>}
          {generalError(update.error) && <Alert tone="danger">{generalError(update.error)}</Alert>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={update.isPending}>{moving ? "Save and move" : "Save changes"}</Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

export function LeaveDialog({ student, onClose }: { student: StudentRecord; onClose: () => void }) {
  const leave = useLeaveSchool();
  const [status, setStatus] = useState<Exclude<StudentStatus, "ACTIVE">>("WITHDRAWN");
  const [on, setOn] = useState(today());
  const [reason, setReason] = useState("");
  const first = firstName(student.fullName);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    leave.mutate({ id: student.id, status, on, reason: reason || null }, { onSuccess: () => { toast(`${first} is marked as ${LEFT_LABEL[status].title.toLowerCase()}`); onClose(); } });
  };

  return (
    <Dialog open onClose={onClose} title={`${first} is leaving`} description={`${first} keeps their record and past results. They come off ${student.armName}'s list and score sheets from now on.`}>
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <fieldset className="grid gap-2">
          <legend className="mb-1.5 text-sm font-medium">Why are they leaving?</legend>
          {(Object.keys(LEFT_LABEL) as (keyof typeof LEFT_LABEL)[]).map((value) => (
            <label key={value} className={cx("flex cursor-pointer items-start gap-3 rounded-2xl p-3 transition-colors", status === value ? "bg-accent-soft" : "bg-sunken hover:bg-hover")}>
              <input type="radio" name="leave-status" value={value} checked={status === value} onChange={() => setStatus(value)} className="mt-1 h-4 w-4 accent-[var(--color-accent)]" />
              <span>
                <b className="block text-[15px] font-semibold">{LEFT_LABEL[value].title}</b>
                <span className="text-[13px] text-text-secondary">{LEFT_LABEL[value].detail}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <TextField label="Last day" type="date" value={on} max={today()} min={student.joinedOn} onChange={(e) => setOn(e.target.value)} error={fieldError(leave.error, "on")} />
        <TextAreaField label="Note (optional)" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={status === "TRANSFERRED" ? "e.g. Moved to a school in Abuja" : "e.g. Family relocated"} />
        {generalError(leave.error) && <Alert tone="danger">{generalError(leave.error)}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="danger" loading={leave.isPending}>Mark as {LEFT_LABEL[status].title.toLowerCase()}</Button>
        </div>
      </form>
    </Dialog>
  );
}

/** Age in whole years on a day (today by default). */
export const ageOn = (dob: string, on = new Date()) => {
  const born = new Date(dob);
  let age = on.getFullYear() - born.getFullYear();
  if (on.getMonth() < born.getMonth() || (on.getMonth() === born.getMonth() && on.getDate() < born.getDate())) age -= 1;
  return age;
};

export function InviteParentDialog({ student, onClose }: { student: Pick<AdminStudent, "id" | "fullName"> | null; onClose: () => void }) {
  if (!student) return null;
  return <InviteParentForm key={student.id} student={student} onClose={onClose} />;
}

function InviteParentForm({ student, onClose }: { student: Pick<AdminStudent, "id" | "fullName">; onClose: () => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const invite = useInviteParent();
  const first = student.fullName.split(" ")[0];

  const submit = (event: FormEvent) => {
    event.preventDefault();
    invite.mutate({ studentId: student.id, fullName, email }, { onSuccess: () => { toast(`Invite sent to ${email.trim()}`); onClose(); } });
  };

  return (
    <Dialog open onClose={onClose} title={`Invite ${first}'s parent`} description={`They'll get a link to set a password and see ${first}'s results. It works for 72 hours.`}>
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <TextField label="Parent's name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={`e.g. Mrs Bola ${student.fullName.split(" ").slice(-1)[0]}`} data-autofocus error={fieldError(invite.error, "fullName")} />
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoCapitalize="none" spellCheck={false} error={fieldError(invite.error, "email")} hint="No email? Print an access code from the student's record instead." />
        {generalError(invite.error) && <Alert tone="danger">{generalError(invite.error)}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={invite.isPending}><Icon name="mail" className="h-4 w-4" />Send invite</Button>
        </div>
      </form>
    </Dialog>
  );
}

