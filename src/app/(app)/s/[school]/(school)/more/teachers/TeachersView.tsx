"use client";

import { inviteAdminSchema } from "@brillianda/core/auth";
import { Badge } from "@brillianda/ui/Badge";
import { Button } from "@brillianda/ui/Button";
import { EmptyState } from "@brillianda/ui/EmptyState";
import { Icon } from "@brillianda/ui/Icon";
import { levelStyle } from "@brillianda/ui/levels";
import { PageHeader } from "@brillianda/ui/PageHeader";
import { ResponsiveDialog } from "@brillianda/ui/ResponsiveDialog";
import { SelectField, TextField } from "@brillianda/ui/TextField";
import { toast } from "@brillianda/ui/Toast";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { SampleLinks } from "@/components/auth/forms";
import { FormError } from "@/components/auth/FormError";
import type { ActionResult, SampleEmail, TeachersPage, TeacherSummary } from "@/data/types";
import { firstErrors, type Errors } from "@/lib/form";
import { errorsFor } from "@/lib/formCheck";
import { initials } from "@/lib/initials";

type Open = { kind: "invite" } | { kind: "form"; teacher: TeacherSummary } | { kind: "subjects"; teacher: TeacherSummary } | { kind: "remove"; teacher: TeacherSummary } | null;

/** More › Teachers (batch 11): invite teachers, then give each a form class and subject classes. */
export function TeachersView({
  page,
  invite,
  remove,
  setForm,
  setSubjects,
}: {
  page: TeachersPage;
  invite: (input: unknown) => Promise<ActionResult<SampleEmail & { resent: boolean }>>;
  remove: (id: string) => Promise<ActionResult<null>>;
  setForm: (armId: string, userId: string | null) => Promise<ActionResult<null>>;
  setSubjects: (userId: string, input: unknown) => Promise<ActionResult<null>>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState<Open>(null);
  const close = () => setOpen(null);
  const nameOf = (id: string | null) => page.teachers.find((t) => t.id === id)?.fullName;
  const active = page.teachers.filter((t) => t.status === "active");

  return (
    <>
      <PageHeader
        title="Teachers"
        actions={
          <Button onClick={() => setOpen({ kind: "invite" })}>
            <Icon name="plus" className="h-4 w-4" />
            Invite a teacher
          </Button>
        }
      >
        Each teacher sees only the classes they teach, and, if they’re a form teacher, that class’s daily register. A form class is optional: many teachers only teach subjects.
      </PageHeader>

      {page.teachers.length === 0 ? (
        <div className="rounded-3xl bg-surface p-6 shadow-raised">
          <EmptyState title="No teachers yet">Invite your teachers by email. Then make each one a form teacher, and give them the subjects they teach.</EmptyState>
        </div>
      ) : (
        <ul className="grid gap-3">
          {page.teachers.map((t, i) => (
            <li key={t.id} className="grid gap-4 rounded-3xl bg-surface p-5 shadow-raised sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:p-6" style={levelStyle(i)}>
              <div className="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)] gap-3.5">
                <span aria-hidden className="grid h-11 w-11 place-items-center rounded-full text-sm font-semibold" style={{ background: "var(--tint)", color: "var(--deep)" }}>
                  {initials(t.fullName)}
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2">
                    <b className="font-semibold">{t.fullName}</b>
                    {t.status === "invited" && <Badge tone="warning">Invited</Badge>}
                  </p>
                  <p className="truncate text-[13px] text-text-secondary">{t.email}</p>
                  {t.status === "active" && (
                    <dl className="mt-3 grid gap-1.5 text-sm">
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="text-text-secondary">Form class:</dt>
                        <dd className="font-medium">{t.formArms.length ? t.formArms.map((a) => a.label).join(", ") : "None"}</dd>
                      </div>
                      <div className="flex flex-wrap gap-x-2">
                        <dt className="text-text-secondary">Teaches:</dt>
                        <dd className="font-medium">{t.subjectClasses.length ? t.subjectClasses.map((c) => c.label).join("; ") : "No subjects yet"}</dd>
                      </div>
                    </dl>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:justify-end">
                {t.status === "active" ? (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => setOpen({ kind: "form", teacher: t })}>
                      Form class
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setOpen({ kind: "subjects", teacher: t })}>
                      Subjects
                    </Button>
                    <Button size="sm" variant="danger-quiet" onClick={() => setOpen({ kind: "remove", teacher: t })}>
                      Remove
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="danger-quiet" onClick={() => setOpen({ kind: "remove", teacher: t })}>
                    Cancel invite
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {active.length > 0 && <p className="mt-4 text-sm text-text-secondary">{page.arms.filter((a) => !a.formTeacherId).length} of {page.arms.length} classes have no form teacher yet.</p>}

      {open?.kind === "invite" && <InviteDialog invite={invite} onClose={close} onDone={() => router.refresh()} />}
      {open?.kind === "form" && <FormClassDialog teacher={open.teacher} page={page} nameOf={nameOf} setForm={setForm} onClose={close} onDone={() => (close(), router.refresh())} />}
      {open?.kind === "subjects" && <SubjectsDialog teacher={open.teacher} page={page} setSubjects={setSubjects} onClose={close} onDone={() => (close(), router.refresh())} />}
      {open?.kind === "remove" && <RemoveDialog teacher={open.teacher} remove={remove} onClose={close} onDone={() => (close(), router.refresh())} />}
    </>
  );
}

function InviteDialog({ invite, onClose, onDone }: { invite: (input: unknown) => Promise<ActionResult<SampleEmail & { resent: boolean }>>; onClose: () => void; onDone: () => void }) {
  const [values, setValues] = useState({ fullName: "", email: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [sent, setSent] = useState<SampleEmail | null>(null);
  const [pending, startTransition] = useTransition();
  const set = (key: "fullName" | "email") => (value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };
  const submit = () => {
    const problems = errorsFor(inviteAdminSchema, values);
    if (problems) return setErrors(problems);
    startTransition(async () => {
      const result = await invite(values);
      if (!result.ok) {
        setErrors(firstErrors(result.fieldErrors));
        return setFailure(result.fieldErrors ? null : result.error);
      }
      setSent(result.data);
      onDone();
    });
  };
  return (
    <ResponsiveDialog open onClose={onClose} title="Invite a teacher" description="They get an email with a link to set a password. It works for 72 hours.">
      {sent ? (
        <div className="grid gap-4" role="status">
          <p className="text-sm">Invite sent to {values.email}.</p>
          <SampleLinks links={sent.sampleLinks} />
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <TextField label="Full name" value={values.fullName} onChange={(e) => set("fullName")(e.target.value)} error={errors.fullName} autoComplete="off" />
          <TextField label="Email" type="email" value={values.email} onChange={(e) => set("email")(e.target.value)} error={errors.email} autoCapitalize="none" spellCheck={false} />
          <FormError message={failure} />
          <Button type="submit" loading={pending}>
            Send the invite
          </Button>
        </form>
      )}
    </ResponsiveDialog>
  );
}

function FormClassDialog({
  teacher,
  page,
  nameOf,
  setForm,
  onClose,
  onDone,
}: {
  teacher: TeacherSummary;
  page: TeachersPage;
  nameOf: (id: string | null) => string | undefined;
  setForm: (armId: string, userId: string | null) => Promise<ActionResult<null>>;
  onClose: () => void;
  onDone: () => void;
}) {
  const current = teacher.formArms[0]?.armId ?? "";
  const [armId, setArmId] = useState(current);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const holder = page.arms.find((a) => a.id === armId)?.formTeacherId;
  const takesOver = armId && holder && holder !== teacher.id ? nameOf(holder) : null;

  const save = () =>
    startTransition(async () => {
      // Moving to another class leaves the old one without a form teacher.
      for (const old of teacher.formArms) if (old.armId !== armId) await setForm(old.armId, null);
      const result = armId ? await setForm(armId, teacher.id) : { ok: true as const, data: null };
      if (!result.ok) return setFailure(result.error);
      toast(armId ? `${teacher.fullName} is now form teacher of ${page.arms.find((a) => a.id === armId)?.label}` : `${teacher.fullName} has no form class now`);
      onDone();
    });

  return (
    <ResponsiveDialog open onClose={onClose} title={`${teacher.fullName}’s form class`} description="The form teacher takes the class’s daily register.">
      <div className="grid gap-4">
        <SelectField label="Form class" value={armId} onChange={(e) => setArmId(e.target.value)}>
          <option value="">None</option>
          {page.arms.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
              {a.formTeacherId && a.formTeacherId !== teacher.id ? ` (now ${nameOf(a.formTeacherId)})` : ""}
            </option>
          ))}
        </SelectField>
        {takesOver && <p className="text-sm text-text-secondary">{takesOver} stops being this class’s form teacher.</p>}
        <FormError message={failure} />
        <Button onClick={save} loading={pending} disabled={armId === current}>
          Save
        </Button>
      </div>
    </ResponsiveDialog>
  );
}

function SubjectsDialog({
  teacher,
  page,
  setSubjects,
  onClose,
  onDone,
}: {
  teacher: TeacherSummary;
  page: TeachersPage;
  setSubjects: (userId: string, input: unknown) => Promise<ActionResult<null>>;
  onClose: () => void;
  onDone: () => void;
}) {
  const key = (armId: string, subjectId: string) => `${armId}|${subjectId}`;
  const [picked, setPicked] = useState(() => new Set(teacher.subjectClasses.map((c) => key(c.armId, c.subjectId))));
  const [subjectId, setSubjectId] = useState(teacher.subjectClasses[0]?.subjectId ?? page.subjects[0]?.id ?? "");
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Who teaches each subject class now, so taking one over is visible.
  const others = new Map<string, string>();
  for (const t of page.teachers) if (t.id !== teacher.id) for (const c of t.subjectClasses) others.set(key(c.armId, c.subjectId), t.fullName);
  const subjectName = (id: string) => page.subjects.find((s) => s.id === id)?.name ?? "";
  const armLabel = (id: string) => page.arms.find((a) => a.id === id)?.label ?? "";
  const toggle = (k: string) =>
    setPicked((all) => {
      const next = new Set(all);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const save = () =>
    startTransition(async () => {
      const classes = [...picked].map((k) => {
        const [armId, subject] = k.split("|");
        return { armId: armId!, subjectId: subject! };
      });
      const result = await setSubjects(teacher.id, classes);
      if (!result.ok) return setFailure(result.error);
      toast(`${teacher.fullName}’s subjects saved`);
      onDone();
    });

  return (
    <ResponsiveDialog open onClose={onClose} title={`${teacher.fullName}’s subjects`} description="Pick a subject, then tick the classes they teach it to. Each class’s subject has one teacher.">
      <div className="grid gap-4">
        <SelectField label="Subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          {page.subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </SelectField>
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">Classes for {subjectName(subjectId)}</legend>
          <div className="grid max-h-64 gap-1 overflow-y-auto rounded-2xl bg-sunken p-2 sm:grid-cols-2">
            {page.arms.map((a) => {
              const k = key(a.id, subjectId);
              const by = others.get(k);
              return (
                <label key={a.id} className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl px-3 hover:bg-hover">
                  <input type="checkbox" checked={picked.has(k)} onChange={() => toggle(k)} className="h-4 w-4 accent-[var(--color-accent)]" />
                  <span className="text-sm">
                    {a.label}
                    {by && <span className="block text-[12px] text-text-secondary">Now {by}</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <div aria-live="polite" className="text-sm">
          <p className="font-medium">
            {picked.size} {picked.size === 1 ? "class" : "classes"} in all
          </p>
          {picked.size > 0 && (
            <p className="mt-1 text-text-secondary">
              {[...picked]
                .map((k) => {
                  const [armId, subject] = k.split("|");
                  return `${subjectName(subject!)}, ${armLabel(armId!)}`;
                })
                .join("; ")}
            </p>
          )}
        </div>
        <FormError message={failure} />
        <Button onClick={save} loading={pending}>
          Save subjects
        </Button>
      </div>
    </ResponsiveDialog>
  );
}

function RemoveDialog({ teacher, remove, onClose, onDone }: { teacher: TeacherSummary; remove: (id: string) => Promise<ActionResult<null>>; onClose: () => void; onDone: () => void }) {
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const invited = teacher.status === "invited";
  return (
    <ResponsiveDialog
      open
      onClose={onClose}
      title={invited ? `Cancel ${teacher.fullName}’s invite?` : `Remove ${teacher.fullName}?`}
      description={invited ? "The link in their email stops working." : "They can’t sign in to this school any more. Registers they took stay, with their name."}
    >
      <div className="grid gap-3">
        <FormError message={failure} />
        <Button
          variant="danger"
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await remove(teacher.id);
              if (!result.ok) return setFailure(result.error);
              toast(invited ? "Invite cancelled" : `${teacher.fullName} removed`);
              onDone();
            })
          }
        >
          {invited ? "Cancel the invite" : "Remove"}
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Keep
        </Button>
      </div>
    </ResponsiveDialog>
  );
}
