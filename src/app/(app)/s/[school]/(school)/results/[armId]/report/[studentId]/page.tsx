import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { PrintButton } from "@/components/results/PublishButton";
import { ReportCard } from "@/components/results/ReportCard";
import { getReportCard } from "@/data/reports";

export const metadata: Metadata = { title: "Report card" };

export default async function AdminReportCard({ params }: PageProps<"/s/[school]/results/[armId]/report/[studentId]">) {
  const { school, armId, studentId } = await params;
  await connection();
  const card = await getReportCard(school, studentId);
  if (!card) notFound();
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/s/${school}/results/${armId}/broadsheet`} className="rounded text-sm font-medium text-text-secondary hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
          ← Broadsheet
        </Link>
        <PrintButton />
      </div>
      {!card.published && <p className="text-sm text-text-secondary print:hidden">Not published yet: parents can’t see this card until the class is.</p>}
      <ReportCard card={card} />
    </div>
  );
}
