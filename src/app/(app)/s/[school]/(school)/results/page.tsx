import { Card, ProgressBar } from "@brillianda/ui/Cards";
import { EmptyState } from "@brillianda/ui/EmptyState";
import { Icon } from "@brillianda/ui/Icon";
import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getResultsOverview } from "@/data/results";
import { timeAgo } from "@/lib/time";

export const metadata: Metadata = { title: "Results" };

/** Results this term: each class's score sheets, and teachers' requests to unlock one. */
export default async function ResultsPage({ params }: PageProps<"/s/[school]/results">) {
  const { school } = await params;
  await connection();
  const o = await getResultsOverview(school);
  if (!o) return null;
  const now = new Date().getTime();
  const base = `/s/${school}/results`;

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Results"
        actions={
          <Link href={`/s/${school}/more/results`} className="inline-flex min-h-[44px] items-center rounded-full bg-raise px-5 text-sm font-medium shadow-raised hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
            Results settings
          </Link>
        }
      >
        {o.term ? `${o.term.name}, ${o.term.session}. Subject teachers fill in their sheets; you can fill in or correct any of them.` : "Results start when the first term does."}
      </PageHeader>

      {o.requests.length > 0 && (
        <Card title="Asked to unlock" description="Teachers who need to change a sheet they marked complete.">
          <ul className="grid gap-2">
            {o.requests.map((r) => (
              <li key={r.id}>
                <Link href={`${base}/${r.armId}/${r.subjectId}`} className="block rounded-2xl bg-warning-bg p-3 text-sm hover:brightness-95 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
                  <b className="font-semibold">
                    {r.subjectName}, {r.armLabel}
                  </b>
                  <span className="block">
                    {r.by}: “{r.reason}” · {timeAgo(r.at, now)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {o.arms.length === 0 ? (
        <div className="rounded-3xl bg-surface p-6 shadow-raised">
          <EmptyState title="No classes with students yet">Score sheets appear for each class once it has students and subjects.</EmptyState>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {o.arms.map((a) => (
            <li key={a.armId}>
              <Link href={`${base}/${a.armId}`} className="grid gap-3 rounded-3xl bg-surface p-5 shadow-raised hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
                <span className="flex items-center justify-between gap-2">
                  <b className="text-[17px] font-semibold">{a.label}</b>
                  <Icon name="chevron" className="h-4 w-4 text-text-muted" />
                </span>
                <ProgressBar value={a.sheets ? a.complete / a.sheets : 0} />
                <span className="text-[13px] text-text-secondary">
                  {a.complete} of {a.sheets} subjects complete{a.inProgress ? `, ${a.inProgress} in progress` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
