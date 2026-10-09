"use client";

import { Button } from "@brillianda/ui/Button";
import { ProgressBar } from "@brillianda/ui/Cards";
import { cx } from "@brillianda/ui/cx";
import { Icon } from "@brillianda/ui/Icon";
import { toast } from "@brillianda/ui/Toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { ActionResult, SetupItemId, SetupProgress } from "@/data/types";

// The plan's setup checklist: worked through in any order, left halfway, never a gate. Each step
// says what it unlocks. It can be hidden, and it goes for good once everything is done.

const ITEMS: Record<SetupItemId, { title: string; unlocks: string; path: string; action: string; optional?: boolean }> = {
  calendar: { title: "Set your academic calendar", unlocks: "Your session and its terms, so every record sits in the right term.", path: "more/sessions", action: "Set dates" },
  classes: { title: "Add your classes", unlocks: "JSS 1 to SS 3, or whatever your school runs, in one step.", path: "classes", action: "Add classes" },
  arms: { title: "Split classes into arms", unlocks: "Students sit in an arm, like JSS 1 Gold.", path: "classes", action: "Add arms" },
  subjects: { title: "Choose your subjects", unlocks: "Start from the national list and tick what you teach.", path: "subjects", action: "Choose" },
  students: { title: "Add your students", unlocks: "One by one, or import your whole list from a spreadsheet.", path: "students", action: "Add students" },
  admins: { title: "Invite an admin", unlocks: "Someone to share the setup and the day-to-day records.", path: "more/admins", action: "Invite", optional: true },
};

export function SetupChecklist({
  school,
  schoolName,
  setup,
  isOwner,
  hide,
}: {
  school: string;
  schoolName: string;
  setup: SetupProgress;
  isOwner: boolean;
  hide: (hidden: boolean) => Promise<ActionResult<null>>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Only the owner invites admins, so admins don't see that step.
  const items = setup.items.filter((item) => isOwner || item.id !== "admins");
  const done = items.filter((item) => item.done).length;
  if (done === items.length) return null;

  const setHidden = (hidden: boolean) =>
    startTransition(async () => {
      const result = await hide(hidden);
      if (!result.ok) toast(result.error);
      router.refresh();
    });

  if (setup.hidden) {
    return (
      <p className="text-sm text-text-secondary">
        Setup: {done} of {items.length} done.{" "}
        <button type="button" disabled={pending} onClick={() => setHidden(false)} className="font-medium text-accent hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
          Show the checklist
        </button>
      </p>
    );
  }

  const next = items.find((item) => !item.done)?.id;
  return (
    <section aria-labelledby="setup-title" className="animate-pop rounded-3xl bg-surface p-5 shadow-raised sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="setup-title" className="text-[17px] font-semibold tracking-[-0.02em]">
            Finish setting up {schoolName}
          </h2>
          <p className="mt-0.5 text-[13px] text-text-secondary">
            {done} of {items.length} done. Do them in any order; none of it stops you using Brillianda in the meantime.
          </p>
        </div>
        <Button size="sm" variant="ghost" loading={pending} onClick={() => setHidden(true)}>
          Hide
        </Button>
      </div>
      <div className="mt-3 max-w-sm">
        <ProgressBar value={done / items.length} color="var(--color-chart)" />
      </div>
      <ul className="mt-4 grid gap-2">
        {items.map(({ id, done: isDone }) => {
          const item = ITEMS[id];
          return (
            <li key={id} className={cx("grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]", id === next ? "bg-sunken" : "")}>
              <span aria-hidden className={cx("grid h-8 w-8 place-items-center rounded-full", isDone ? "bg-success-bg text-success" : "bg-raise text-text-muted shadow-raised")}>
                {isDone ? <Icon name="check" className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-current" />}
              </span>
              <div className="min-w-0">
                <b className={cx("block text-[15px] font-semibold", isDone && "text-text-secondary line-through decoration-text-muted")}>
                  {item.title}
                  {item.optional && !isDone && <span className="font-normal text-text-secondary"> (optional)</span>}
                  <span className="sr-only">{isDone ? " (done)" : ""}</span>
                </b>
                {!isDone && <span className="block text-[13px] text-text-secondary">{item.unlocks}</span>}
              </div>
              {!isDone && (
                <Link
                  href={`/s/${school}/${item.path}`}
                  className={cx(
                    "col-start-2 inline-flex min-h-[36px] items-center justify-self-start rounded-full px-4 text-[13px] font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent sm:col-start-auto",
                    id === next ? "bg-primary text-primary-text" : "bg-raise shadow-raised",
                  )}
                >
                  {item.action}
                  <span className="sr-only">: {item.title}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
