import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PrintButton } from "@/components/results/PublishButton";
import { ReportCard } from "@/components/results/ReportCard";
import { getParentReportCard } from "@/data/parents";
import { schoolBase } from "@/lib/schoolBase";

export const metadata: Metadata = { title: "Report card" };

/** A child's report card, for their parent, once the school has published the class's results. */
export default async function ParentReportCard({ params, searchParams }: PageProps<"/s/[school]/family/[studentId]/report">) {
  const { school, studentId } = await params;
  const sb = await schoolBase(school);
  const raw = (await searchParams).term;
  const termKey = (Array.isArray(raw) ? raw[0] : raw) || undefined;
  await connection();
  const card = await getParentReportCard(school, studentId, termKey);
  if (!card) notFound();
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`${sb}/family/${studentId}`} className="rounded text-sm font-medium text-text-secondary hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
          ← {card.student.fullName.split(" ")[0]}
        </Link>
        <PrintButton />
      </div>
      <ReportCard card={card} />
    </div>
  );
}
