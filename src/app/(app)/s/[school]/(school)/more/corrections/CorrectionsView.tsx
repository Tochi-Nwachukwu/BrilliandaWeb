"use client";

import { CORRECTION_LABEL_FOR_SCHOOL, type CorrectableField } from "@brillianda/core/corrections";
import { GENDER_LABEL, type StudentGender } from "@brillianda/core/students";
import { Badge } from "@brillianda/ui/Badge";
import { Button } from "@brillianda/ui/Button";
import { Card } from "@brillianda/ui/Cards";
import { EmptyState } from "@brillianda/ui/EmptyState";
import { TextField } from "@brillianda/ui/TextField";
import { toast } from "@brillianda/ui/Toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult, CorrectionRow, CorrectionsPage } from "@/data/types";
import { formatDate, timeAgo } from "@/lib/time";

function shown(field: CorrectableField, value: string): string {
  if (!value) return "Not given";
  if (field === "dateOfBirth") return formatDate(value);
  if (field === "gender") return GENDER_LABEL[value as StudentGender] ?? value;
  return value;
}

/** More › Corrections (batch 21): parents asking to correct their child's details. */
export function CorrectionsView({
  page,
  base,
  now,
  resolve,
}: {
  page: CorrectionsPage;
  base: string;
  now: number;
  resolve: (id: string, input: unknown) => Promise<ActionResult<null>>;
}) {
  return (
    <div className="grid gap-4">
      {page.open.length === 0 ? (
        <EmptyState title="Nothing waiting">When a parent asks to correct their child’s details, the request shows here for you to check.</EmptyState>
      ) : (
        <ul className="grid gap-3" aria-label="Waiting">
          {page.open.map((c) => (
            <li key={c.id}>
              <Request row={c} base={base} now={now} resolve={resolve} />
            </li>
          ))}
        </ul>
      )}
      {page.answered.length > 0 && (
        <Card title="Answered">
          <ul className="grid gap-2" aria-label="Answered">
            {page.answered.map((c) => (
              <li key={c.id} className="rounded-2xl bg-sunken p-3.5 text-sm">
                <p className="flex flex-wrap items-center justify-between gap-2">
                  <b className="font-semibold">{c.studentName}</b>
                  <Badge tone={c.status === "approved" ? "success" : "neutral"}>{c.status === "approved" ? "Corrected" : "Declined"}</Badge>
                </p>
                <p className="mt-1 text-text-secondary">
                  {c.changes.map((ch) => CORRECTION_LABEL_FOR_SCHOOL[ch.field]).join(", ")} · {c.decided ? `${c.decided.by}, ${timeAgo(c.decided.at, now)}` : ""}
                  {c.decided?.reason ? ` · “${c.decided.reason}”` : ""}
                </p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Request({ row, base, now, resolve }: { row: CorrectionRow; base: string; now: number; resolve: (id: string, input: unknown) => Promise<ActionResult<null>> }) {
  const router = useRouter();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  const answer = (approve: boolean) =>
    startTransition(async () => {
      const result = await resolve(row.id, approve ? { approve: true } : { approve: false, reason });
      if (!result.ok) {
        setError(result.fieldErrors?.reason?.[0]);
        if (!result.fieldErrors) toast(result.error);
        return;
      }
      toast(approve ? `${row.studentName}’s record is corrected` : "Declined. The parent sees your reason.");
      router.refresh();
    });

  return (
    <section aria-label={`${row.studentName}’s correction`} className="rounded-3xl bg-surface p-5 shadow-raised sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <Link href={`${base}/students/${row.studentId}`} className="text-[17px] font-semibold tracking-[-0.02em] underline-offset-2 hover:underline">
            {row.studentName}
          </Link>
          <p className="text-sm text-text-secondary">
            {row.armLabel} · asked by {row.by}, {timeAgo(row.at, now)}
          </p>
        </div>
        <Badge tone="warning">Waiting</Badge>
      </div>
      <ul className="mt-4 grid gap-2">
        {row.changes.map((ch) => (
          <li key={ch.field} className="grid gap-1 rounded-2xl bg-sunken p-3 text-sm sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-center">
            <b className="font-medium">{CORRECTION_LABEL_FOR_SCHOOL[ch.field]}</b>
            <span>
              <span className="text-text-secondary line-through">{shown(ch.field, ch.from)}</span> → <b className="font-semibold">{shown(ch.field, ch.to)}</b>
            </span>
          </li>
        ))}
      </ul>
      {row.note && <p className="mt-3 text-sm text-text-secondary">“{row.note}”</p>}
      {declining ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <TextField label="Why not? The parent sees this." value={reason} onChange={(e) => setReason(e.target.value)} error={error} />
          <div className="flex gap-2">
            <Button variant="danger" loading={pending} onClick={() => answer(false)}>
              Decline
            </Button>
            <Button variant="ghost" onClick={() => setDeclining(false)}>
              Back
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button loading={pending} onClick={() => answer(true)}>
            Correct the record
          </Button>
          <Button variant="ghost" onClick={() => setDeclining(true)}>
            Decline
          </Button>
        </div>
      )}
    </section>
  );
}
