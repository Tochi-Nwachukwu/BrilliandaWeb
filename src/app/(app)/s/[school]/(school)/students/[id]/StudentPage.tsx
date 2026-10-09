"use client";

import { displayNigerianPhone } from "@brillianda/core/nigeria";
import { GENDER_LABEL, STATUS_LABEL } from "@brillianda/core/students";
import { Badge } from "@brillianda/ui/Badge";
import { Button } from "@brillianda/ui/Button";
import { Card } from "@brillianda/ui/Cards";
import { EmptyState } from "@brillianda/ui/EmptyState";
import { levelStyle } from "@brillianda/ui/levels";
import { ResponsiveDialog } from "@brillianda/ui/ResponsiveDialog";
import { toast } from "@brillianda/ui/Toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { initials } from "@/lib/initials";
import { formatDate, timeAgo } from "@/lib/time";
import type { ActionResult, ArmOption, StudentDetail } from "@/data/types";
import { STATUS_TONE, StatusDialog } from "../StudentsView";

function Fact({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  // A <div> per pair is the one wrapper a <dl> allows, so screen readers still pair each label and value.
  return (
    <div className={wide ? "col-span-2 grid gap-0.5" : "grid gap-0.5"}>
      <dt className="text-[12.5px] text-text-secondary">{label}</dt>
      <dd className="font-medium">{children || <span className="font-normal text-text-muted">Not given</span>}</dd>
    </div>
  );
}

/** A student's page (plan: details, guardians, class history and change history). */
export function StudentPage({
  school,
  student,
  arm,
  now,
  setStatus,
  remove,
}: {
  school: string;
  student: StudentDetail;
  arm: ArmOption | null;
  now: number;
  setStatus: (input: unknown) => Promise<ActionResult<{ changed: number }>>;
  remove: () => Promise<ActionResult<null>>;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"status" | "delete" | null>(null);
  const [pending, startTransition] = useTransition();
  const base = `/s/${school}/students`;

  return (
    <div className="grid gap-4">
      <Link href={base} className="text-sm font-medium text-accent hover:underline">
        ← Students
      </Link>
      <header className="flex flex-wrap items-center gap-4 rounded-[28px] bg-surface p-5 shadow-raised" style={levelStyle(arm?.levelPosition ?? 0)}>
        <span aria-hidden className="grid h-16 w-16 shrink-0 place-items-center rounded-full text-lg font-semibold" style={{ background: "var(--tint)", color: "var(--deep)" }}>
          {initials(student.fullName)}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[26px] font-medium leading-tight tracking-[-0.03em]">{student.fullName}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
            {arm?.label ?? "No class"} · {student.admissionNo}
            <Badge tone={STATUS_TONE[student.status]}>{STATUS_LABEL[student.status]}</Badge>
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          <Link
            href={`${base}/${student.id}/edit`}
            className="inline-flex min-h-[42px] flex-1 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-text hover:bg-primary-hover sm:flex-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Edit
          </Link>
          <Button variant="secondary" className="flex-1 sm:flex-none" onClick={() => setDialog("status")}>
            Change status
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Details">
          <dl className="grid grid-cols-2 gap-4">
            <Fact label="Gender">{GENDER_LABEL[student.gender]}</Fact>
            <Fact label="Date of birth">{student.dateOfBirth && formatDate(student.dateOfBirth)}</Fact>
            <Fact label="Admission date">{student.admissionDate && formatDate(student.admissionDate)}</Fact>
            <Fact label="State of origin">{student.stateOfOrigin}</Fact>
            <Fact label="Address" wide>{student.address}</Fact>
          </dl>
        </Card>

        <Card title="Guardian">
          {student.guardian ? (
            <div className="grid gap-4">
              <dl className="grid grid-cols-2 gap-4">
                <Fact label="Name">{student.guardian.name}</Fact>
                <Fact label="Phone">{student.guardian.phone && <a href={`tel:${student.guardian.phone}`} className="text-accent hover:underline">{displayNigerianPhone(student.guardian.phone)}</a>}</Fact>
                <Fact label="Email" wide>{student.guardian.email}</Fact>
              </dl>
              {student.guardian.siblings.length > 0 && (
                <div>
                  <p className="text-[12.5px] text-text-secondary">Also guardian of</p>
                  <ul className="mt-1.5 flex flex-wrap gap-2">
                    {student.guardian.siblings.map((s) => (
                      <li key={s.id}>
                        <Link href={`${base}/${s.id}`} className="inline-flex min-h-[36px] items-center rounded-full bg-accent-soft px-3.5 text-[13px] font-medium text-accent hover:brightness-95">
                          {s.fullName} · {s.armLabel}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <EmptyState title="No guardian yet">Add one from Edit. A phone number already on file links siblings to the same guardian.</EmptyState>
          )}
        </Card>

        <Card title="Classes">
          <ol className="grid gap-2">
            {[...student.classHistory].reverse().map((c, i) => (
              <li key={`${c.armLabel}-${c.from}`} className="flex items-center justify-between gap-3 rounded-2xl bg-sunken px-3.5 py-2.5 text-sm">
                <b className="font-semibold">{c.armLabel}</b>
                <span className="text-text-secondary">
                  {i === 0 ? "Since" : "From"} {formatDate(c.from)}
                </span>
              </li>
            ))}
          </ol>
        </Card>

        <Card title="Changes" description="Who changed this record, newest first.">
          {student.changes.length ? (
            <ul className="grid gap-2">
              {student.changes.slice(0, 10).map((c) => (
                <li key={c.id} className="text-sm">
                  <b className="font-semibold">{c.who}</b> <span className="text-text-secondary">{c.what.charAt(0).toLowerCase() + c.what.slice(1)}</span>
                  <span className="block text-[12.5px] text-text-muted">{timeAgo(c.at, now)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-secondary">No changes since this record was added.</p>
          )}
        </Card>
      </div>

      <div className="rounded-3xl border border-dashed border-border-strong p-4 text-sm text-text-secondary">
        Added by mistake?{" "}
        <button type="button" onClick={() => setDialog("delete")} className="font-medium text-danger hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
          Delete {student.firstName}
        </button>
        . For a student who left, change the status instead, so their record stays.
      </div>

      {dialog === "status" && (
        <StatusDialog
          count={1}
          onClose={() => setDialog(null)}
          change={(next) => setStatus({ studentIds: [student.id], status: next })}
          onDone={(_, next) => {
            toast(`${student.firstName} marked ${STATUS_LABEL[next].toLowerCase()}`);
            setDialog(null);
            router.refresh();
          }}
        />
      )}
      <ResponsiveDialog
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
        title={`Delete ${student.fullName}?`}
        description="Only for a student added by mistake. They disappear from every list."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialog(null)}>
              Keep
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await remove();
                  if (!result.ok) return void toast(result.error);
                  toast(`${student.fullName} deleted`);
                  router.push(base);
                })
              }
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">If they left the school, close this and change their status instead.</p>
      </ResponsiveDialog>
    </div>
  );
}
