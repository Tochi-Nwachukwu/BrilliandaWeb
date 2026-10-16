"use client";

import { matchesSearch } from "@brillianda/core/students";
import { Badge } from "@brillianda/ui/Badge";
import { Button } from "@brillianda/ui/Button";
import { EmptyState } from "@brillianda/ui/EmptyState";
import { ResponsiveDialog } from "@brillianda/ui/ResponsiveDialog";
import { SelectField, TextField } from "@brillianda/ui/TextField";
import { toast } from "@brillianda/ui/Toast";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormError } from "@/components/auth/FormError";
import type { ActionResult, SampleEmail, StudentAccountsPage } from "@/data/types";

type Row = StudentAccountsPage["students"][number];
const ACCESS = { active: ["Uses the portal", "success"], invited: ["Invited", "warning"], none: ["Not invited", "neutral"] } as const;

/** More › Student accounts (batch 23): who uses the student portal, inviting and ending access. */
export function StudentAccountsView({
  page,
  invite,
  remove,
}: {
  page: StudentAccountsPage;
  invite: (studentId: string, input: unknown) => Promise<ActionResult<SampleEmail>>;
  remove: (studentId: string) => Promise<ActionResult<null>>;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [armId, setArmId] = useState("");
  const [inviting, setInviting] = useState<Row | null>(null);
  const [links, setLinks] = useState<SampleEmail["sampleLinks"]>([]);
  const [pending, startTransition] = useTransition();
  const shown = page.students.filter((s) => (!armId || s.armId === armId) && (!query.trim() || matchesSearch(s, query)));
  const active = page.students.filter((s) => s.access === "active").length;

  return (
    <div className="grid gap-4">
      <p className="text-sm text-text-secondary">
        {active} of {page.students.length} students use the student portal. Each one signs in with their own email and a password they choose.
      </p>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <TextField label="Search" type="search" placeholder="Name or admission number" value={query} onChange={(e) => setQuery(e.target.value)} />
        <SelectField label="Class" value={armId} onChange={(e) => setArmId(e.target.value)}>
          <option value="">Every class</option>
          {page.arms.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </SelectField>
      </div>

      {links && links.length > 0 && (
        <p className="rounded-2xl bg-sunken p-3.5 text-sm">
          Sample invite (no email is sent yet):{" "}
          {links.map((l) => (
            <a key={l.href} href={l.href} className="font-semibold text-accent underline underline-offset-2">
              {l.label}
            </a>
          ))}
        </p>
      )}

      {shown.length === 0 ? (
        <EmptyState title="No students match">Try another name, or every class.</EmptyState>
      ) : (
        <ul className="grid gap-1.5 rounded-3xl bg-surface p-2 shadow-raised" aria-label="Students">
          {shown.map((s) => (
            <li key={s.id} className="grid gap-2 rounded-2xl p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <span className="min-w-0">
                <b className="block truncate font-semibold">{s.fullName}</b>
                <span className="block truncate text-[12.5px] text-text-secondary">
                  {s.armLabel} · {s.admissionNo}
                  {s.email ? ` · ${s.email}` : ""}
                </span>
              </span>
              <span className="flex flex-wrap items-center gap-2 sm:justify-end">
                <Badge tone={ACCESS[s.access][1]}>{ACCESS[s.access][0]}</Badge>
                {s.access !== "active" && (
                  <Button size="sm" variant="secondary" onClick={() => setInviting(s)}>
                    {s.access === "invited" ? "Send again" : "Invite"}
                  </Button>
                )}
                {s.access !== "none" && (
                  <Button
                    size="sm"
                    variant="danger-quiet"
                    loading={pending}
                    aria-label={`End ${s.fullName}’s access`}
                    onClick={() =>
                      startTransition(async () => {
                        const result = await remove(s.id);
                        toast(result.ok ? `${s.fullName.split(" ")[0]} can no longer sign in` : result.error);
                        if (result.ok) router.refresh();
                      })
                    }
                  >
                    {s.access === "invited" ? "Cancel" : "End access"}
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {inviting && (
        <InviteDialog
          student={inviting}
          onClose={() => setInviting(null)}
          invite={invite}
          onDone={(sample) => {
            setInviting(null);
            setLinks(sample);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function InviteDialog({
  student,
  onClose,
  invite,
  onDone,
}: {
  student: Row;
  onClose: () => void;
  invite: (studentId: string, input: unknown) => Promise<ActionResult<SampleEmail>>;
  onDone: (links: SampleEmail["sampleLinks"]) => void;
}) {
  const [email, setEmail] = useState(student.email ?? "");
  const [error, setError] = useState<string | undefined>();
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const send = () =>
    startTransition(async () => {
      const result = await invite(student.id, { email });
      if (!result.ok) {
        setError(result.fieldErrors?.email?.[0]);
        return setFailure(result.fieldErrors ? null : result.error);
      }
      toast(`Invite sent to ${email.trim()}`);
      onDone(result.data.sampleLinks);
    });

  return (
    <ResponsiveDialog
      open
      onClose={onClose}
      title={`Invite ${student.fullName.split(" ")[0]}`}
      description="We email a link to set a password. Use the student’s own email, or one the school gives them."
      footer={
        <Button className="w-full" loading={pending} onClick={send}>
          Send the invite
        </Button>
      }
    >
      <div className="grid gap-3">
        <TextField label="Student’s email" type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
        <FormError message={failure} />
      </div>
    </ResponsiveDialog>
  );
}
