import { EmptyState } from "@brillianda/ui/EmptyState";
import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { SheetList } from "@/components/results/SheetList";
import { getArmSheets } from "@/data/results";

export const metadata: Metadata = { title: "Class results" };

/** One class's score sheets this term. */
export default async function ArmResultsPage({ params }: PageProps<"/s/[school]/results/[armId]">) {
  const { school, armId } = await params;
  await connection();
  const data = await getArmSheets(school, armId);
  if (!data) notFound();
  const done = data.sheets.filter((s) => s.status === "complete").length;
  return (
    <div className="grid gap-4">
      <Link href={`/s/${school}/results`} className="w-fit rounded text-sm font-medium text-text-secondary hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
        ← Results
      </Link>
      <PageHeader title={data.armLabel}>
        {data.term.name}, {data.term.session}. {done} of {data.sheets.length} subjects complete.
      </PageHeader>
      {data.sheets.length ? (
        <SheetList sheets={data.sheets} show="subject" hrefOf={(s) => `/s/${school}/results/${armId}/${s.subjectId}`} />
      ) : (
        <div className="rounded-3xl bg-surface p-6 shadow-raised">
          <EmptyState title="No subjects for this class">Attach subjects to {data.armLabel}’s level on the Subjects page.</EmptyState>
        </div>
      )}
    </div>
  );
}
