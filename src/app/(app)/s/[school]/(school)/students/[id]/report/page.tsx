import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PrintButton } from "@/components/results/PublishButton";
import { ReportCard } from "@/components/results/ReportCard";
import { getReportCard } from "@/data/reports";
import { schoolBase } from "@/lib/schoolBase";

export const metadata: Metadata = { title: "Report card" };

/** A student's report card for any term they have results in (from their profile). */
export default async function StudentReportCard({ params, searchParams }: PageProps<"/s/[school]/students/[id]/report">) {
  const { school, id } = await params;
  const sb = await schoolBase(school);
  const raw = (await searchParams).term;
  const termKey = (Array.isArray(raw) ? raw[0] : raw) || undefined;
  await connection();
  const card = await getReportCard(school, id, termKey);
  if (!card) notFound();
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`${sb}/students/${id}`} className="rounded text-sm font-medium text-text-secondary hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
          ← {card.student.fullName}
        </Link>
        <PrintButton />
      </div>
      <ReportCard card={card} />
    </div>
  );
}
