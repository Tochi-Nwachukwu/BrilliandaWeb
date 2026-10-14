import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ScoreSheet } from "@/components/results/ScoreSheet";
import { markComplete, requestUnlock, resolveUnlock, saveScore, setExcluded } from "@/data/actions/results";
import { getScoreSheet } from "@/data/results";

export const metadata: Metadata = { title: "Score sheet" };

/** Any class's score sheet, for owners and admins: fill in for a teacher, correct, or unlock. */
export default async function AdminSheetPage({ params }: PageProps<"/s/[school]/results/[armId]/[subjectId]">) {
  const { school, armId, subjectId } = await params;
  await connection();
  const sheet = await getScoreSheet(school, armId, subjectId);
  if (!sheet) notFound();
  return (
    <>
      <Link href={`/s/${school}/results/${armId}`} className="mb-3 inline-block rounded text-sm font-medium text-text-secondary hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
        ← {sheet.armLabel}
      </Link>
      <PageHeader title={`${sheet.subjectName}, ${sheet.armLabel}`} />
      <ScoreSheet
        sheet={sheet}
        now={new Date().getTime()}
        actions={{
          save: saveScore.bind(null, school, armId, subjectId),
          exclude: setExcluded.bind(null, school, armId, subjectId),
          complete: markComplete.bind(null, school, armId, subjectId),
          requestUnlock: requestUnlock.bind(null, school, armId, subjectId),
          resolveUnlock: resolveUnlock.bind(null, school, armId, subjectId),
        }}
      />
    </>
  );
}
