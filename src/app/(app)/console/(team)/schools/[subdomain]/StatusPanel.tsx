"use client";

import { Button } from "@brillianda/ui/Button";
import { Card } from "@brillianda/ui/Cards";
import { TextAreaField } from "@brillianda/ui/TextField";
import { toast } from "@brillianda/ui/Toast";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormError } from "@/components/auth/FormError";
import type { ActionResult, ConsoleSchoolDetail } from "@/data/types";
import { timeAgo } from "@/lib/time";

/** Pause a school, or bring it back, with a reason the school sees in its history. */
export function StatusPanel({
  school,
  status,
  note,
  now,
  save,
}: {
  school: string;
  status: ConsoleSchoolDetail["status"];
  note: ConsoleSchoolDetail["statusNote"];
  now: number;
  save: (status: "active" | "suspended", reason: unknown) => Promise<ActionResult<null>>;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const paused = status === "suspended";
  const next = paused ? "active" : "suspended";

  return (
    <Card title="Account" description={paused ? "Paused: its people can’t sign in. Nothing is deleted." : "Active."}>
      <div className="grid gap-4">
        {note && (
          <p className="rounded-2xl bg-sunken px-4 py-3 text-sm">
            {note.status === "suspended" ? "Paused" : "Reactivated"} by {note.by}, {timeAgo(note.at, now)}: “{note.reason}”
          </p>
        )}
        <TextAreaField
          label={paused ? "Why reactivate it?" : "Why pause it?"}
          hint="The school sees this in its change history."
          value={reason}
          maxLength={200}
          onChange={(e) => {
            setReason(e.target.value);
            setError(undefined);
          }}
          error={error}
        />
        <FormError message={failure} />
        <Button
          variant={paused ? "primary" : "danger"}
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              setFailure(null);
              const result = await save(next, reason);
              if (!result.ok) {
                setError(result.fieldErrors?.reason?.[0]);
                return setFailure(result.fieldErrors ? null : result.error);
              }
              toast(paused ? `${school} is active again` : `${school} is paused`);
              setReason("");
              router.refresh();
            })
          }
        >
          {paused ? "Reactivate the school" : "Pause the school"}
        </Button>
      </div>
    </Card>
  );
}
