"use client";

import { INVITE_LIFETIME_HOURS, inviteAdminSchema, ROLE_LABEL } from "@brillianda/core";
import { Badge, Button, Icon, PageHeader, ResponsiveDialog, TextField, levelStyle, toast } from "@brillianda/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { initials } from "@/lib/initials";
import { SampleLinks } from "@/components/auth/forms";
import { FormError } from "@/components/auth/FormError";
import { errorsFor, firstErrors, type Errors } from "@/lib/form";
import type { ActionResult, SampleEmail, SchoolMember } from "@/data/types";

type Invite = (input: unknown) => Promise<ActionResult<SampleEmail & { resent: boolean }>>;

/** The school's team. Only the owner invites, resends, cancels and removes. */
export function AdminsList({
  members,
  meId,
  isOwner,
  invite,
  cancel,
  remove,
}: {
  members: SchoolMember[];
  meId: string;
  isOwner: boolean;
  invite: Invite;
  cancel: (inviteId: string) => Promise<ActionResult<null>>;
  remove: (userId: string) => Promise<ActionResult<null>>;
}) {
  const router = useRouter();
  const [inviting, setInviting] = useState<{ fullName: string; email: string } | null>(null);
  const [removing, setRemoving] = useState<SchoolMember | null>(null);
  const [sample, setSample] = useState<SampleEmail["sampleLinks"]>();
  const [busy, startTransition] = useTransition();
  const admins = members.filter((m) => m.status === "active").length;

  const act = (run: () => Promise<ActionResult<unknown>>, done: string) =>
    startTransition(async () => {
      const result = await run();
      toast(result.ok ? done : result.error);
      router.refresh();
    });

  return (
    <>
      <PageHeader
        title="Admins"
        actions={
          isOwner && (
            <Button onClick={() => setInviting({ fullName: "", email: "" })}>
              <Icon name="plus" className="h-4 w-4" />
              Invite an admin
            </Button>
          )
        }
      >
        {admins === 1 ? "Just you so far." : `${admins} people help run the school.`} Admins run setup and student records; only the owner can invite or remove them.
      </PageHeader>

      <ul className="grid gap-0.5 rounded-3xl bg-surface p-2 shadow-raised">
        {members.map((member, i) => (
          <li
            key={member.id}
            className="grid grid-cols-[2.6rem_minmax(0,1fr)] items-center gap-x-3.5 gap-y-2 rounded-2xl p-3 hover:bg-hover md:grid-cols-[2.6rem_minmax(0,1.4fr)_minmax(0,1fr)_17rem]"
            style={levelStyle(i)}
          >
            <span aria-hidden className="grid h-10 w-10 place-items-center rounded-full text-[13px] font-semibold" style={{ background: "var(--tint)", color: "var(--deep)" }}>
              {initials(member.fullName)}
            </span>
            <div className="min-w-0">
              <b className="block truncate font-semibold">
                {member.fullName}
                {member.id === meId && <span className="font-normal text-text-secondary"> (you)</span>}
              </b>
              <p className="truncate text-[12.5px] text-text-secondary">{member.email}</p>
            </div>
            <p className="hidden text-[13px] text-text-secondary md:block">{ROLE_LABEL[member.role]}</p>
            {/* On phones the actions sit under the name, so a row with several never squeezes it. */}
            <div className="col-start-2 flex flex-wrap items-center gap-1.5 empty:hidden md:col-start-auto md:justify-end">
              {member.status === "invited" ? (
                <>
                  <Badge tone="info">Invite sent</Badge>
                  {isOwner && (
                    <>
                      <Button size="sm" variant="ghost" disabled={busy} onClick={() => setInviting({ fullName: member.fullName, email: member.email })}>
                        Resend
                      </Button>
                      <Button size="sm" variant="danger-quiet" disabled={busy} onClick={() => act(() => cancel(member.id), `Invite to ${member.email} cancelled`)}>
                        Cancel
                      </Button>
                    </>
                  )}
                </>
              ) : member.role === "owner" ? (
                <Badge tone="success">Owner</Badge>
              ) : (
                isOwner && (
                  <Button size="sm" variant="danger-quiet" disabled={busy} onClick={() => setRemoving(member)}>
                    Remove
                  </Button>
                )
              )}
            </div>
          </li>
        ))}
      </ul>

      {sample && (
        <div className="max-w-md">
          <SampleLinks links={sample} />
        </div>
      )}

      {inviting && (
        <InviteDialog
          initial={inviting}
          invite={invite}
          onClose={() => setInviting(null)}
          onSent={(result, email) => {
            setInviting(null);
            setSample(result.sampleLinks);
            toast(result.resent ? `We’ve sent ${email} a fresh invite` : `Invite sent to ${email}`);
            router.refresh();
          }}
        />
      )}

      <ResponsiveDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={`Remove ${removing?.fullName.split(" ")[0] ?? ""}?`}
        description="They’ll lose access to this school straight away. Their changes stay in the record."
        footer={
          <>
            <Button variant="secondary" onClick={() => setRemoving(null)}>
              Keep them
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={() => {
                const member = removing!;
                setRemoving(null);
                act(() => remove(member.id), `${member.fullName} removed`);
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">{removing?.email}</p>
      </ResponsiveDialog>
    </>
  );
}

function InviteDialog({
  initial,
  invite,
  onClose,
  onSent,
}: {
  initial: { fullName: string; email: string };
  invite: Invite;
  onClose: () => void;
  onSent: (result: SampleEmail & { resent: boolean }, email: string) => void;
}) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    setFailure(null);
    const problems = errorsFor(inviteAdminSchema, values);
    if (problems) return setErrors(problems);
    startTransition(async () => {
      const result = await invite(values);
      if (result.ok) return onSent(result.data, values.email.trim().toLowerCase());
      setErrors(firstErrors(result.fieldErrors));
      setFailure(result.fieldErrors ? null : result.error);
    });
  };

  const set = (field: keyof typeof values) => (value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }));
  };

  return (
    <ResponsiveDialog
      open
      onClose={onClose}
      title="Invite an admin"
      description={`They’ll get an email with a link to join. It works for ${INVITE_LIFETIME_HOURS} hours.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={pending} onClick={() => submit()}>
            <Icon name="mail" className="h-4 w-4" />
            Send invite
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <TextField label="Full name" placeholder="e.g. Ruth Ekanem" data-autofocus value={values.fullName} onChange={(e) => set("fullName")(e.target.value)} error={errors.fullName} />
        <TextField label="Email" type="email" autoCapitalize="none" spellCheck={false} value={values.email} onChange={(e) => set("email")(e.target.value)} error={errors.email} />
        <FormError message={failure} />
        <button type="submit" hidden />
      </form>
    </ResponsiveDialog>
  );
}
