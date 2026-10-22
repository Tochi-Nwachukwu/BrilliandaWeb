import { EmptyState } from "@brillianda/ui/EmptyState";
import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import { connection } from "next/server";
import { SheetList } from "@/components/results/SheetList";
import { getMySheets } from "@/data/results";
import { schoolBase } from "@/lib/schoolBase";

export const metadata: Metadata = { title: "My subjects" };

/** A teacher's score sheets this term, one per class and subject they teach. */
export default async function TeacherSubjects({ params }: PageProps<"/s/[school]/teach/subjects">) {
  const { school } = await params;
  const sb = await schoolBase(school);
  await connection();
  const mine = await getMySheets(school);
  if (!mine) return null;
  const left = mine.sheets.filter((s) => s.status !== "complete").length;

  return (
    <div className="grid gap-4">
      <PageHeader title="My subjects">
        {mine.term ? `${mine.term.name}, ${mine.term.session}. ${left ? `${left} of ${mine.sheets.length} sheets still to finish.` : mine.sheets.length ? "Every sheet is complete." : ""}` : "Score sheets open when the term starts."}
      </PageHeader>
      {mine.sheets.length === 0 ? (
        <div className="rounded-3xl bg-surface p-6 shadow-raised">
          <EmptyState title="No subjects yet">When your school gives you subjects to teach, each class’s score sheet shows here.</EmptyState>
        </div>
      ) : (
        <SheetList sheets={mine.sheets} show="class" hrefOf={(s) => `${sb}/teach/subjects/${s.armId}/${s.subjectId}`} />
      )}
    </div>
  );
}
