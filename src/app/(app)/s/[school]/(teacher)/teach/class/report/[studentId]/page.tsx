import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PrintButton } from "@/components/results/PublishButton";
import { ReportCard } from "@/components/results/ReportCard";
import { getReportCard } from "@/data/reports";
import { schoolBase } from "@/lib/schoolBase";

export const metadata: Metadata = { title: "Report card" };

/** A form teacher's view of one student's report card. */
export default async function TeacherReportCard({ params }: PageProps<"/s/[school]/teach/class/report/[studentId]">) {
  const { school, studentId } = await params;
  const sb = await schoolBase(school);
  await connection();
  const card = await getReportCard(school, studentId);
  if (!card) notFound();
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`${sb}/teach/class`} className="rounded text-sm font-medium text-text-secondary hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
          ← My class
        </Link>
        <PrintButton />
      </div>
      <ReportCard card={card} />
    </div>
  );
}
