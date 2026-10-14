"use client";

import { Alert } from "@brillianda/ui/Alert";
import { Button } from "@brillianda/ui/Button";
import { Card } from "@brillianda/ui/Cards";
import { ResponsiveDialog } from "@brillianda/ui/ResponsiveDialog";
import { TextField } from "@brillianda/ui/TextField";
import { toast } from "@brillianda/ui/Toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormError } from "@/components/auth/FormError";
import type { ActionResult, TermStatusData } from "@/data/types";
import { formatDate } from "@/lib/time";

/**
 * Closing the term open for results (batch 17, from the first app's F-43). Scores lock; results
 * stay on records and with parents where published; the next term's sheets open.
 */
export function CloseTermCard({ school, status, close }: { school: string; status: TermStatusData; close: (input: unknown) => Promise<ActionResult<{ closed: string; next: string | null }>> }) {
  const [open, setOpen] = useState(false);
  const term = status.open;

  return (
    <Card title="Results term" description={term ? `${term.name}, ${term.session}, is open for scores.` : status.waiting ? `${status.waiting.name} opens for scores on ${formatDate(status.waiting.startsOn)}.` : "No term is open for scores."}>
      <div className="grid gap-3">
        {term && term.isLast && (
          <p className="text-sm text-text-secondary">
            This is the session’s last term. It closes when you complete promotion at the end of the session, which moves students up and starts the next session.
          </p>
        )}
        {term && term.isLast && (
          <div>
            <Link href={`/s/${school}/more/promotion`} className="inline-flex min-h-[44px] items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-text hover:bg-primary-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
              Go to promotion
            </Link>
          </div>
        )}
        {term && !term.isLast && (
          <>
            <p className="text-sm text-text-secondary">
              Close it when the term’s results are done. Its scores then lock, its report cards stay on each student’s record, and{status.following ? ` ${status.following.name}’s` : " the next term’s"} sheets open.
            </p>
            {status.unpublished.length > 0 && (
              <Alert tone="warning">
                Not published yet: {status.unpublished.map((u) => u.label).join(", ")}.{" "}
                <Link href={`/s/${school}/results`} className="font-medium underline underline-offset-2">
                  Publish on the Results page
                </Link>
              </Alert>
            )}
            <div>
              <Button variant="secondary" onClick={() => setOpen(true)}>
                Close {term.name}
              </Button>
            </div>
          </>
        )}
        {status.closed.length > 0 && (
          <p className="text-[13px] text-text-secondary">Closed: {status.closed.map((c) => `${c.name} ${c.session}`).join(", ")}.</p>
        )}
      </div>
      {open && term && <CloseDialog status={status} close={close} onClose={() => setOpen(false)} />}
    </Card>
  );
}

function CloseDialog({ status, close, onClose }: { status: TermStatusData; close: (input: unknown) => Promise<ActionResult<{ closed: string; next: string | null }>>; onClose: () => void }) {
  const router = useRouter();
  const term = status.open!;
  const [startsOn, setStartsOn] = useState(status.following?.startsOn ?? "");
  const [endsOn, setEndsOn] = useState(status.following?.endsOn ?? "");
  const [anyway, setAnyway] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const blocked = status.unpublished.length > 0 && !anyway;

  return (
    <ResponsiveDialog open onClose={onClose} title={`Close ${term.name}?`} description="Scores for this term lock. You can still see and print its report cards.">
      <div className="grid gap-4">
        {status.following && (
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField label={`${status.following.name} starts`} type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} />
            <TextField label={`${status.following.name} ends`} type="date" value={endsOn} min={startsOn} onChange={(e) => setEndsOn(e.target.value)} />
          </div>
        )}
        {status.unpublished.length > 0 && (
          <label className="flex items-start gap-3 rounded-2xl bg-warning-bg p-3 text-sm">
            <input type="checkbox" checked={anyway} onChange={(e) => setAnyway(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]" />
            <span>
              Close anyway. {status.unpublished.length === 1 ? "One class isn’t" : `${status.unpublished.length} classes aren’t`} published, and {status.unpublished.length === 1 ? "its" : "their"} parents won’t see {term.name}’s results.
            </span>
          </label>
        )}
        <FormError message={failure} />
        <Button
          variant="danger"
          disabled={blocked}
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await close({ closeUnpublished: anyway, nextStartsOn: startsOn, nextEndsOn: endsOn });
              if (!result.ok) return setFailure(result.error);
              toast(`${result.data.closed} closed${result.data.next ? `; ${result.data.next} is next` : ""}`);
              onClose();
              router.refresh();
            })
          }
        >
          Close {term.name}
        </Button>
      </div>
    </ResponsiveDialog>
  );
}
