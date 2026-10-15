"use client";

import { BIRTHDAY_FIELDS, BIRTHDAY_SEND_TIME, birthdayMessage, birthdaySettingsSchema, smsCount } from "@brillianda/core/birthdays";
import { Badge } from "@brillianda/ui/Badge";
import { Button } from "@brillianda/ui/Button";
import { Card } from "@brillianda/ui/Cards";
import { EmptyState } from "@brillianda/ui/EmptyState";
import { TextAreaField } from "@brillianda/ui/TextField";
import { toast } from "@brillianda/ui/Toast";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { FormError } from "@/components/auth/FormError";
import type { ActionResult, BirthdaysPage } from "@/data/types";
import { errorsFor } from "@/lib/formCheck";
import { formatShortDate, soonLabel } from "@/lib/time";

/** More › Birthdays (batch 19): the school's message, who's next, and what went out. */
export function BirthdaysView({ page, save }: { page: BirthdaysPage; save: (input: unknown) => Promise<ActionResult<null>> }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(page.settings.enabled);
  const [message, setMessage] = useState(page.settings.message);
  const [error, setError] = useState<string | undefined>();
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const box = useRef<HTMLTextAreaElement>(null);

  // The preview uses the next birthday child, or a made-up one.
  const next = page.upcoming[0];
  const sample = next ? { firstName: next.fullName.split(" ")[0]!, age: next.turns } : { firstName: "Ada", age: 12 };
  const preview = birthdayMessage(message, sample, page.schoolName);
  const count = smsCount(preview);

  const insert = (field: string) => {
    const el = box.current;
    const at = el?.selectionStart ?? message.length;
    const end = el?.selectionEnd ?? at;
    setMessage((m) => m.slice(0, at) + field + m.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + field.length, at + field.length);
    });
  };

  const submit = () => {
    setFailure(null);
    const input = { enabled, message };
    const problems = errorsFor(birthdaySettingsSchema, input);
    if (problems) {
      setError(problems.message);
      return;
    }
    startTransition(async () => {
      const result = await save(input);
      if (!result.ok) {
        setError(result.fieldErrors?.message?.[0]);
        return setFailure(result.fieldErrors ? null : result.error);
      }
      toast(enabled ? "Birthday messages saved" : "Birthday messages are off");
      router.refresh();
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:items-start">
      <Card title="Birthday messages" description={`On a student’s birthday, at ${BIRTHDAY_SEND_TIME} Lagos time, their guardian gets a text, and the parent app shows a birthday card.`}>
        <div className="grid gap-4">
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
            <b className="font-medium">Send birthday messages</b>
          </label>
          <div className="grid gap-2">
            <TextAreaField
              ref={box}
              label="Message"
              rows={4}
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                setError(undefined);
              }}
              error={error}
              hint="Each child’s first name, age and the school’s name are filled in."
            />
            <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Add to the message">
              {BIRTHDAY_FIELDS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => insert(f)}
                  className="inline-flex min-h-[36px] items-center rounded-full bg-raise px-3.5 text-[13px] font-medium shadow-raised hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
                >
                  Add {f}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-sunken p-4">
            <p className="text-[12.5px] font-medium text-text-secondary">Preview, for {sample.firstName}</p>
            <p className="mt-1 text-[15px] leading-relaxed">{preview}</p>
            <p className="mt-2 text-[12.5px] text-text-secondary">
              {count.characters} characters · {count.texts === 1 ? "1 text" : `${count.texts} texts`}
              {count.unicode ? " (letters like ọ and ẹ allow 70 characters a text)" : ""}
            </p>
          </div>
          <FormError message={failure} />
          <Button className="justify-self-start" loading={pending} onClick={submit}>
            Save
          </Button>
        </div>
      </Card>

      <div className="grid gap-4">
        <Card title="Coming up" description="The next 30 days.">
          {page.upcoming.length ? (
            <ul className="grid gap-1" aria-label="Coming birthdays">
              {page.upcoming.map((b) => (
                <li key={`${b.studentId}-${b.on}`} className="flex items-center justify-between gap-3 rounded-2xl p-2.5">
                  <span className="min-w-0">
                    <b className="block truncate font-semibold">{b.fullName}</b>
                    <span className="text-[12.5px] text-text-secondary">
                      {b.armLabel} · turns {b.turns}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-medium">{soonLabel(b.on, b.inDays)}</span>
                    {!b.guardianPhone && <Badge tone="warning">No phone</Badge>}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No birthdays this month">Students’ birthdays come from their date of birth. Add it from a student’s Edit page.</EmptyState>
          )}
        </Card>

        <Card title="Sent">
          {page.sent.length ? (
            <ul className="grid gap-3" aria-label="Messages sent">
              {page.sent.map((m) => (
                <li key={m.id} className="rounded-2xl bg-sunken p-3.5 text-sm">
                  <p className="flex flex-wrap items-center justify-between gap-2">
                    <b className="font-semibold">
                      {m.fullName} <span className="font-normal text-text-secondary">· {m.armLabel}</span>
                    </b>
                    <span className="text-[12.5px] text-text-secondary">{formatShortDate(m.date)}</span>
                  </p>
                  <p className="mt-1 text-text-secondary">{m.to ? `To ${m.to}: ${m.text}` : "Not sent: no phone number on the guardian’s record. Shown on the parent app only."}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-secondary">{enabled ? `Nothing yet. The first texts go out at ${BIRTHDAY_SEND_TIME} on the next birthday.` : "Turn birthday messages on to start sending them."}</p>
          )}
        </Card>
      </div>
    </div>
  );
}
