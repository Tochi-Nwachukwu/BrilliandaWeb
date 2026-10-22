import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArmHeader } from "@/components/results/ArmHeader";
import { BroadsheetTable } from "@/components/results/BroadsheetTable";
import { getBroadsheet } from "@/data/reports";
import { schoolBase } from "@/lib/schoolBase";

export const metadata: Metadata = { title: "Broadsheet" };

export default async function BroadsheetPage({ params }: PageProps<"/s/[school]/results/[armId]/broadsheet">) {
  const { school, armId } = await params;
  const sb = await schoolBase(school);
  await connection();
  const sheet = await getBroadsheet(school, armId);
  if (!sheet) notFound();
  return (
    <>
      <ArmHeader school={school} sheet={sheet} tab="broadsheet" />
      <p className="mb-3 text-sm text-text-secondary">Each cell is the subject total and grade. A dot is a subject not finished yet; a dash, an elective the student doesn’t take. Open a name for the report card.</p>
      <BroadsheetTable sheet={sheet} reportHref={(id) => `${sb}/results/${armId}/report/${id}`} />
    </>
  );
}
