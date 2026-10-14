import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ScoreSheet } from "@/components/results/ScoreSheet";
import { markComplete, requestUnlock, resolveUnlock, saveScore, setExcluded } from "@/data/actions/results";
import { getScoreSheet } from "@/data/results";

export const metadata: Metadata = { title: "Score sheet" };

/** A subject teacher's score sheet for one of their classes (batch 14). */
export default async function TeacherSheetPage({ params }: PageProps<"/s/[school]/teach/subjects/[armId]/[subjectId]">) {
  const { school, armId, subjectId } = await params;
  await connection();
  const sheet = await getScoreSheet(school, armId, subjectId);
  if (!sheet) notFound();
  return (
    <>
      <Link href={`/s/${school}/teach/subjects`} className="mb-3 inline-block rounded text-sm font-medium text-text-secondary hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
        ← My subjects
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
