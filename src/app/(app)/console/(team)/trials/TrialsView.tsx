"use client";

import { displayNigerianPhone } from "@brillianda/core/nigeria";
import { Badge } from "@brillianda/ui/Badge";
import { Button } from "@brillianda/ui/Button";
import { EmptyState } from "@brillianda/ui/EmptyState";
import { ResponsiveDialog } from "@brillianda/ui/ResponsiveDialog";
import { SelectField, TextAreaField } from "@brillianda/ui/TextField";
import { toast } from "@brillianda/ui/Toast";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormError } from "@/components/auth/FormError";
import type { ActionResult, TrialRequestRow, TrialStatus } from "@/data/types";
import { timeAgo } from "@/lib/time";

const LABEL: Record<TrialStatus, string> = { new: "New", contacted: "Contacted", converted: "Signed up", declined: "Declined" };
const TONE: Record<TrialStatus, "info" | "warning" | "success" | "neutral"> = { new: "info", contacted: "warning", converted: "success", declined: "neutral" };

/** Trial requests, newest first, filtered by where the team is with each. */
export function TrialsView({ requests, now, save }: { requests: TrialRequestRow[]; now: number; save: (id: string, status: string, note: unknown) => Promise<ActionResult<null>> }) {
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [open, setOpen] = useState<TrialRequestRow | null>(null);
  const shown = requests.filter((r) => filter === "all" || r.status === "new" || r.status === "contacted");

  return (
    <div className="grid gap-4">
      <div className="max-w-xs">
        <SelectField label="Show" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="open">New and contacted</option>
          <option value="all">All requests</option>
        </SelectField>
      </div>
      {shown.length === 0 ? (
        <div className="rounded-3xl bg-surface p-6 shadow-raised">
          <EmptyState title="Nothing waiting">New requests from the website show here.</EmptyState>
        </div>
      ) : (
        <ul className="grid gap-3">
          {shown.map((r) => (
            <li key={r.id} className="grid gap-3 rounded-3xl bg-surface p-5 shadow-raised sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
              <div className="min-w-0 text-sm">
                <p className="flex flex-wrap items-center gap-2">
                  <b className="text-[16px] font-semibold">{r.schoolName}</b>
                  <Badge tone={TONE[r.status]}>{LABEL[r.status]}</Badge>
                </p>
                <p className="mt-1 text-text-secondary">
                  {r.contactName}, {r.role} · {r.studentCount.toLocaleString()} students{r.state ? ` · ${r.state}` : ""} · {timeAgo(r.at, now)}
                </p>
                <p className="mt-1">
                  <a href={`mailto:${r.email}`} className="text-accent underline underline-offset-2">
                    {r.email}
                  </a>{" "}
                  ·{" "}
                  <a href={`tel:${r.phone}`} className="text-accent underline underline-offset-2">
                    {displayNigerianPhone(r.phone)}
                  </a>
                </p>
                {r.interests.length > 0 && <p className="mt-1 text-text-secondary">Interested in: {r.interests.join(", ")}</p>}
                {r.message && <p className="mt-2 rounded-xl bg-sunken px-3 py-2">“{r.message}”</p>}
                {r.note && <p className="mt-2 text-text-secondary">Team note: {r.note}</p>}
              </div>
              <Button size="sm" variant="secondary" onClick={() => setOpen(r)}>
                Update
              </Button>
            </li>
          ))}
        </ul>
      )}
      {open && <UpdateDialog request={open} save={save} onClose={() => setOpen(null)} />}
    </div>
  );
}

function UpdateDialog({ request, save, onClose }: { request: TrialRequestRow; save: (id: string, status: string, note: unknown) => Promise<ActionResult<null>>; onClose: () => void }) {
  const router = useRouter();
  const [status, setStatus] = useState<TrialStatus>(request.status);
  const [note, setNote] = useState(request.note ?? "");
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <ResponsiveDialog open onClose={onClose} title={request.schoolName} description="Where the team is with this request.">
      <div className="grid gap-4">
        <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value as TrialStatus)}>
          {(Object.keys(LABEL) as TrialStatus[]).map((s) => (
            <option key={s} value={s}>
              {LABEL[s]}
            </option>
          ))}
        </SelectField>
        <TextAreaField label="Note for the team" hint="Optional, e.g. “Demo booked for Thursday”." value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
        <FormError message={failure} />
        <Button
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await save(request.id, status, note);
              if (!result.ok) return setFailure(result.error);
              toast("Request updated");
              onClose();
              router.refresh();
            })
          }
        >
          Save
        </Button>
      </div>
    </ResponsiveDialog>
  );
}
