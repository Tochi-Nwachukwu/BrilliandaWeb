import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArmHeader } from "@/components/results/ArmHeader";
import { RemarksForm } from "@/components/results/RemarksForm";
import { saveRating, saveRemark } from "@/data/actions/reports";
import { getBroadsheet, getClassReports } from "@/data/reports";

export const metadata: Metadata = { title: "Remarks" };

export default async function RemarksPage({ params }: PageProps<"/s/[school]/results/[armId]/remarks">) {
  const { school, armId } = await params;
  await connection();
  const [sheet, reports] = await Promise.all([getBroadsheet(school, armId), getClassReports(school, armId)]);
  if (!sheet || !reports) notFound();
  return (
    <>
      <ArmHeader school={school} sheet={sheet} tab="remarks" />
      <RemarksForm reports={reports} saveRemark={saveRemark.bind(null, school, armId)} saveRating={saveRating.bind(null, school, armId)} />
    </>
  );
}
