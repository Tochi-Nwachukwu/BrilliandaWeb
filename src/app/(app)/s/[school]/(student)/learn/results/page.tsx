import { ordinal } from "@brillianda/core/grading";
import { Card } from "@brillianda/ui/Cards";
import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getStudentHome } from "@/data/learners";

export const metadata: Metadata = { title: "Results" };

const linkClass = "block rounded-xl p-2.5 text-sm font-medium underline-offset-2 hover:bg-hover hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent";

/** A student's results (batch 23): this term once published, and earlier published terms. */
export default async function StudentResults({ params }: PageProps<"/s/[school]/learn/results">) {
  const { school } = await params;
  await connection();
  const home = await getStudentHome(school);
  if (!home) return null;
  const report = `/s/${school}/learn/results/report`;
  return (
    <div className="grid gap-4">
      <PageHeader title="Results">Your report cards, once the school publishes them.</PageHeader>
      <Card title="This term" description={home.results?.term}>
        {home.results?.published ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              Average <b className="text-[20px] font-semibold tabular-nums">{home.results.average ?? "—"}</b>
              {home.results.position ? ` · ${ordinal(home.results.position)} of ${home.results.of} in ${home.armLabel}` : ""}
            </p>
            <Link
              href={report}
              className="inline-flex min-h-[44px] items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-text hover:bg-primary-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
            >
              Open your report card
            </Link>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">{home.results ? "Not out yet. The school publishes them when every subject is marked." : "Results come with the school term."}</p>
        )}
      </Card>
      {home.pastTerms.length > 0 && (
        <Card title="Earlier terms">
          <ul className="grid gap-1">
            {home.pastTerms.map((t) => (
              <li key={t.key}>
                <Link href={`${report}?term=${t.key}`} className={linkClass}>
                  {t.label}: report card
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
