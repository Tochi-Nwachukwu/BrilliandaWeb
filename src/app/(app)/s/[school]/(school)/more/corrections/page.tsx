import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import { connection } from "next/server";
import { resolveCorrection } from "@/data/actions/corrections";
import { getCorrections } from "@/data/corrections";
import { CorrectionsView } from "./CorrectionsView";
import { schoolBase } from "@/lib/schoolBase";

export const metadata: Metadata = { title: "Corrections" };

export default async function CorrectionsPage({ params }: PageProps<"/s/[school]/more/corrections">) {
  const { school } = await params;
  const sb = await schoolBase(school);
  // "2 hours ago" depends on the time now.
  await connection();
  const page = await getCorrections(school);
  if (!page) return null;
  return (
    <div className="grid gap-4">
      <PageHeader title="Corrections">Parents asking to correct their child’s details. Check each one: correcting it changes the student’s record and goes in the change history.</PageHeader>
      <CorrectionsView page={page} base={sb} now={new Date().getTime()} resolve={resolveCorrection.bind(null, school)} />
    </div>
  );
}
