import { useState, type FormEvent } from "react";
import type { StaffMember } from "@brillanda/shared-types";
import { fieldError, generalError } from "../../shared/auth/LoginPage";
import { Alert } from "../../shared/components/Alert";
import { Badge } from "../../shared/components/Badge";
import { Button } from "../../shared/components/Button";
import { ProgressBar } from "../../shared/components/Cards";
import { Icon } from "../../shared/components/Icon";
import { Dialog } from "../../shared/components/Overlay";
import { PageHeader } from "../../shared/components/PageHeader";
import { PageSpinner } from "../../shared/components/Spinner";
import { TextField } from "../../shared/components/TextField";
import { toast } from "../../shared/components/Toast";
import { levelStyle } from "../../shared/theme/levels";
import { plural } from "../../shared/utils/time";
import { useInviteStaff, useStaff } from "./api";
import { RemindDialog } from "./parts";

export function StaffPage() {
  const staff = useStaff();
  const [inviting, setInviting] = useState(false);
  const [reminding, setReminding] = useState<StaffMember | null>(null);

  if (staff.isPending) return <PageSpinner />;
  if (staff.error) return <Alert tone="danger">{staff.error.message}</Alert>;

  const teachers = staff.data.filter((s) => s.role === "TEACHER").length;

  return (
    <>
      <PageHeader title="Staff" actions={<Button onClick={() => setInviting(true)}><Icon name="plus" className="h-4 w-4" />Invite staff</Button>}>
        {plural(teachers, "teacher")}. Each one only sees the classes and subjects they're assigned.
      </PageHeader>

      <ul className="grid gap-0.5 rounded-3xl bg-surface p-2 shadow-raised">
        {staff.data.map((member, i) => {
          const level = levelStyle(i);
          const behind = member.sheetsTotal - member.sheetsComplete;
          return (
            <li key={member.id} className="grid grid-cols-[2.6rem_minmax(0,1fr)_auto] items-center gap-3.5 rounded-2xl p-3 hover:bg-hover md:grid-cols-[2.6rem_minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto]" style={level}>
              <span aria-hidden className="grid h-10 w-10 place-items-center rounded-full text-[13px] font-semibold" style={{ background: "var(--tint)", color: "var(--deep)" }}>
                {member.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
              </span>
              <div className="min-w-0"><b className="block font-semibold">{member.fullName}</b><p className="truncate text-[12.5px] text-text-secondary">{member.email}</p></div>
              <p className="hidden text-[13px] text-text-secondary md:block">
                {member.role === "SCHOOL_ADMIN" ? "School admin" : member.subjects.length ? `${member.subjects.join(", ")}, ${plural(member.sheetsTotal, "class", "classes")}` : "Not assigned yet"}
              </p>
              <div className="hidden items-center gap-2.5 md:flex">
                {member.sheetsTotal > 0 && (
                  <>
                    <ProgressBar value={member.sheetsComplete / member.sheetsTotal} color="var(--mid)" className="flex-1" />
                    <span className="text-[12.5px] tabular-nums text-text-secondary">{member.sheetsComplete}/{member.sheetsTotal}</span>
                  </>
                )}
              </div>
              <div className="flex justify-end">
                {member.status === "INVITED" ? (
                  <Badge tone="info">Invite sent</Badge>
                ) : behind > 0 ? (
                  <Button size="sm" variant="secondary" onClick={() => setReminding(member)}>Remind</Button>
                ) : member.sheetsTotal > 0 ? (
                  <Badge tone="success">All done</Badge>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <RemindDialog teachers={reminding ? [{ teacher: reminding, sheets: reminding.sheetsTotal - reminding.sheetsComplete }] : []} open={!!reminding} onClose={() => setReminding(null)} />
      {inviting && <InviteStaffDialog onClose={() => setInviting(false)} />}
    </>
  );
}

function InviteStaffDialog({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({ fullName: "", email: "", role: "TEACHER" as "TEACHER" | "SCHOOL_ADMIN" });
  const invite = useInviteStaff();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    invite.mutate(form, {
      onSuccess: ({ resent }) => {
        toast(resent ? `We've sent ${form.email.trim()} a fresh invite` : `Invite sent to ${form.email.trim()}`);
        onClose();
      },
    });
  };

  return (
    <Dialog open onClose={onClose} title="Invite a member of staff" description="They'll get an email with a link to set their password. It works for 72 hours.">
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Full name" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="e.g. Ruth Ekanem" data-autofocus error={fieldError(invite.error, "fullName")} />
          <label className="grid content-start gap-1.5 text-sm font-medium">
            Role
            <select value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as typeof f.role }))} className="min-h-[46px] rounded-[14px] border-0 bg-sunken px-4 text-base font-normal focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent">
              <option value="TEACHER">Teacher</option>
              <option value="SCHOOL_ADMIN">School admin</option>
            </select>
          </label>
        </div>
        <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} autoCapitalize="none" spellCheck={false} error={fieldError(invite.error, "email")} />
        {generalError(invite.error) && <Alert tone="danger">{generalError(invite.error)}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={invite.isPending}><Icon name="mail" className="h-4 w-4" />Send invite</Button>
        </div>
      </form>
    </Dialog>
  );
}
