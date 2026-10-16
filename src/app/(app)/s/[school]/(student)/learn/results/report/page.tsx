import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PrintButton } from "@/components/results/PublishButton";
import { ReportCard } from "@/components/results/ReportCard";
import { getStudentReportCard } from "@/data/learners";

export const metadata: Metadata = { title: "Report card" };

/** A student's own report card, once the school has published the class's results. */
export default async function StudentReportCard({ params, searchParams }: PageProps<"/s/[school]/learn/results/report">) {
  const { school } = await params;
  const raw = (await searchParams).term;
  const termKey = (Array.isArray(raw) ? raw[0] : raw) || undefined;
  await connection();
  const card = await getStudentReportCard(school, termKey);
  if (!card) notFound();
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/s/${school}/learn/results`} className="rounded text-sm font-medium text-text-secondary hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
          ← Results
        </Link>
        <PrintButton />
      </div>
      <ReportCard card={card} />
    </div>
  );
}
