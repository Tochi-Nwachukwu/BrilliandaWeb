import { EmptyState } from "@brillianda/ui/EmptyState";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArmHeader } from "@/components/results/ArmHeader";
import { SheetList } from "@/components/results/SheetList";
import { getBroadsheet } from "@/data/reports";
import { getArmSheets } from "@/data/results";
import { schoolBase } from "@/lib/schoolBase";

export const metadata: Metadata = { title: "Class results" };

/** One class's score sheets this term. */
export default async function ArmResultsPage({ params }: PageProps<"/s/[school]/results/[armId]">) {
  const { school, armId } = await params;
  const sb = await schoolBase(school);
  await connection();
  const [data, sheet] = await Promise.all([getArmSheets(school, armId), getBroadsheet(school, armId)]);
  if (!data || !sheet) notFound();
  return (
    <>
      <ArmHeader school={school} sheet={sheet} tab="subjects" />
      {data.sheets.length ? (
        <SheetList sheets={data.sheets} show="subject" hrefOf={(s) => `${sb}/results/${armId}/${s.subjectId}`} />
      ) : (
        <div className="rounded-3xl bg-surface p-6 shadow-raised">
          <EmptyState title="No subjects for this class">Attach subjects to {data.armLabel}’s level on the Subjects page.</EmptyState>
        </div>
      )}
    </>
  );
}
