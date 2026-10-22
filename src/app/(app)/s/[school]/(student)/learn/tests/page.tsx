import { Badge } from "@brillianda/ui/Badge";
import { EmptyState } from "@brillianda/ui/EmptyState";
import { Icon } from "@brillianda/ui/Icon";
import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getMyTests } from "@/data/cbt";
import type { StudentTestRow } from "@/data/types";
import { schoolBase } from "@/lib/schoolBase";

export const metadata: Metadata = { title: "Tests" };

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: "Africa/Lagos", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function status(t: StudentTestRow): { label: string; tone: "success" | "warning" | "info" | "neutral" } {
  if (t.attempt === "submitted") return { label: "Submitted", tone: "success" };
  if (t.window === "before") return { label: `Opens ${when(t.opensAt)}`, tone: "neutral" };
  if (t.window === "closed") return { label: t.attempt === "none" ? "Missed" : "Closed", tone: "neutral" };
  return t.attempt === "in progress" ? { label: "In progress", tone: "warning" } : { label: "Open now", tone: "info" };
}

/** A student’s tests (batch 25): open ones first to take, then the rest. */
export default async function StudentTests({ params }: PageProps<"/s/[school]/learn/tests">) {
  const { school } = await params;
  const sb = await schoolBase(school);
  await connection();
  const tests = await getMyTests(school);
  if (!tests) return null;
  const open = tests.filter((t) => t.window === "open" && t.attempt !== "submitted");
  const rest = tests.filter((t) => !open.includes(t));
  const row = (t: StudentTestRow) => {
    const s = status(t);
    return (
      <li key={t.id}>
        <Link href={`${sb}/learn/tests/${t.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-3xl bg-surface p-4 shadow-raised hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
          <span className="min-w-0">
            <b className="block truncate font-semibold">{t.title}</b>
            <span className="block text-[12.5px] text-text-secondary">
              {t.subjectName} · {t.durationMinutes} minutes · closes {when(t.closesAt)}
              {t.where === "school" ? " · in school" : ""}
            </span>
            {t.score && (
              <span className="mt-1 block text-sm">
                Score: <b className="font-semibold tabular-nums">{t.score.total}</b> of {t.score.max}
                {t.score.complete ? "" : " so far"}
              </span>
            )}
          </span>
          <span className="flex items-center gap-2">
            <Badge tone={s.tone}>{s.label}</Badge>
            <Icon name="chevron" className="h-4 w-4 text-text-muted" />
          </span>
        </Link>
      </li>
    );
  };
  return (
    <div className="grid gap-4">
      <PageHeader title="Tests">Tests your teachers set on Brillianda.</PageHeader>
      {tests.length === 0 ? (
        <EmptyState title="No tests yet">When a teacher sets a test for your class, it shows here.</EmptyState>
      ) : (
        <>
          {open.length > 0 && (
            <section aria-labelledby="open-tests">
              <h2 id="open-tests" className="mb-2 text-[15px] font-semibold">Open now</h2>
              <ul className="grid gap-2">{open.map(row)}</ul>
            </section>
          )}
          {rest.length > 0 && (
            <section aria-labelledby="other-tests">
              <h2 id="other-tests" className="mb-2 text-[15px] font-semibold">{open.length ? "Others" : "Your tests"}</h2>
              <ul className="grid gap-2">{rest.map(row)}</ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
