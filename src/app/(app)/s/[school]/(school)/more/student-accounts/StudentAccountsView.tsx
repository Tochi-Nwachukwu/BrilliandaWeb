"use client";

import { matchesSearch } from "@brillianda/core/students";
import { Badge } from "@brillianda/ui/Badge";
import { Button } from "@brillianda/ui/Button";
import { EmptyState } from "@brillianda/ui/EmptyState";
import { ResponsiveDialog } from "@brillianda/ui/ResponsiveDialog";
import { TextAreaField, TextField } from "@brillianda/ui/TextField";
import { toast } from "@brillianda/ui/Toast";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormError } from "@/components/auth/FormError";
import { ClassSelect } from "@/components/ClassSelect";
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
  const [bulk, setBulk] = useState(false);
  const [links, setLinks] = useState<SampleEmail["sampleLinks"]>([]);
  const [pending, startTransition] = useTransition();
  const shown = page.students.filter((s) => (!armId || s.armId === armId) && (!query.trim() || matchesSearch(s, query)));
  const active = page.students.filter((s) => s.access === "active").length;

  return (
    <div className="grid gap-4">
      <p className="text-sm text-text-secondary">
        {active} of {page.students.length} students use the student portal. Each one signs in with their own email and a password they choose.
      </p>
      {page.students.some((s) => s.access === "none") && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-sunken p-3.5">
          <p className="min-w-0 flex-1 text-sm">
            <b className="font-semibold">{page.students.filter((s) => s.access === "none").length} students haven’t been invited.</b> Invite many at once.
          </p>
          <Button size="sm" onClick={() => setBulk(true)}>
            Invite several
          </Button>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <TextField label="Search" type="search" placeholder="Name or admission number" value={query} onChange={(e) => setQuery(e.target.value)} />
        <ClassSelect label="Class" allLabel="Every class" items={page.arms} value={armId} onChange={setArmId} />
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

      {bulk && (
        <BulkInviteDialog
          students={page.students.filter((s) => s.access !== "active")}
          arms={page.arms}
          initialArm={armId}
          invite={invite}
          onClose={() => setBulk(false)}
          onDone={() => {
            setBulk(false);
            router.refresh();
          }}
        />
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

/** Invite many students: an email beside each name (or paste "admission number, email" lines), then send. */
function BulkInviteDialog({
  students,
  arms,
  initialArm,
  invite,
  onClose,
  onDone,
}: {
  students: Row[];
  arms: StudentAccountsPage["arms"];
  initialArm: string;
  invite: (studentId: string, input: unknown) => Promise<ActionResult<SampleEmail>>;
  onClose: () => void;
  onDone: () => void;
}) {
  const [armId, setArmId] = useState(initialArm);
  const [emails, setEmails] = useState<Record<string, string>>(() => Object.fromEntries(students.map((s) => [s.id, s.email ?? ""])));
  const [paste, setPaste] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [problems, setProblems] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const shown = students.filter((s) => !armId || s.armId === armId);
  const ready = shown.filter((s) => emails[s.id]?.trim());

  const fill = () => {
    const byNo = new Map(students.map((s) => [s.admissionNo.toLowerCase(), s.id]));
    const next = { ...emails };
    let matched = 0;
    for (const line of paste.split(/\r?\n/)) {
      const parts = line.split(/[,\t;]/).map((p) => p.trim());
      const id = byNo.get((parts[0] ?? "").toLowerCase());
      const email = parts.find((p) => p.includes("@"));
      if (id && email) {
        next[id] = email;
        matched++;
      }
    }
    setEmails(next);
    setNote(matched ? `Filled ${matched} ${matched === 1 ? "email" : "emails"}.` : "No lines matched. Use one line per student: admission number, email.");
  };

  const send = () =>
    startTransition(async () => {
      const failed: Record<string, string> = {};
      let sent = 0;
      for (const [i, s] of ready.entries()) {
        setProgress(`Sending ${i + 1} of ${ready.length}…`);
        const result = await invite(s.id, { email: emails[s.id] });
        if (result.ok) sent++;
        else failed[s.id] = result.fieldErrors?.email?.[0] ?? result.error;
      }
      setProgress(null);
      setProblems(failed);
      toast(`Invited ${sent} ${sent === 1 ? "student" : "students"}${Object.keys(failed).length ? `. ${Object.keys(failed).length} didn’t go.` : ""}`);
      if (!Object.keys(failed).length) onDone();
    });

  return (
    <ResponsiveDialog
      open
      onClose={onClose}
      title="Invite several students"
      description="Each student gets an email with a link to set a password. Students without an email are skipped."
      footer={
        <Button className="w-full" loading={pending} disabled={!ready.length} onClick={send}>
          {progress ?? `Send ${ready.length} ${ready.length === 1 ? "invite" : "invites"}`}
        </Button>
      }
    >
      <div className="grid gap-4">
        <ClassSelect label="Class" allLabel="Every class" items={arms} value={armId} onChange={setArmId} />
        <div className="grid gap-2">
          <TextAreaField label="Paste emails (optional)" rows={3} placeholder={"0012, ada@example.com\n0013, tunde@example.com"} hint="One line per student: admission number, then email." value={paste} onChange={(e) => setPaste(e.target.value)} />
          <div className="flex items-center gap-3">
            <Button type="button" size="sm" variant="secondary" disabled={!paste.trim()} onClick={fill}>
              Fill the emails
            </Button>
            {note && (
              <span role="status" className="text-sm text-text-secondary">
                {note}
              </span>
            )}
          </div>
        </div>
        {shown.length === 0 ? (
          <p className="text-sm text-text-secondary">Everyone here already has an invite or uses the portal.</p>
        ) : (
          <ul className="grid gap-2" aria-label="Students to invite">
            {shown.map((s) => (
              <li key={s.id} className="grid gap-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:items-start">
                <span className="min-w-0 pt-2.5 text-sm">
                  <b className="block truncate font-semibold">{s.fullName}</b>
                  <span className="block truncate text-[12.5px] text-text-secondary">
                    {s.armLabel} · {s.admissionNo}
                    {s.access === "invited" ? " · invited before" : ""}
                  </span>
                </span>
                <TextField
                  label={`Email for ${s.fullName}`}
                  className="[&>label]:sr-only"
                  type="email"
                  autoCapitalize="none"
                  autoComplete="off"
                  placeholder="Email"
                  value={emails[s.id] ?? ""}
                  onChange={(e) => setEmails((m) => ({ ...m, [s.id]: e.target.value }))}
                  error={problems[s.id]}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </ResponsiveDialog>
  );
}
