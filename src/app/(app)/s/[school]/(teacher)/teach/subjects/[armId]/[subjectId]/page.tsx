import { EmptyState } from "@brillianda/ui/EmptyState";
import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSubjectClass } from "@/data/teaching";
import { plural } from "@/lib/time";

export const metadata: Metadata = { title: "Subject class" };

/** One subject class's students, for its teacher. Read-only until score entry arrives. */
export default async function SubjectClassPage({ params }: PageProps<"/s/[school]/teach/subjects/[armId]/[subjectId]">) {
  const { school, armId, subjectId } = await params;
  const group = await getSubjectClass(school, armId, subjectId);
  if (!group) notFound();

  return (
    <div className="grid gap-4">
      <Link href={`/s/${school}/teach/subjects`} className="w-fit rounded text-sm font-medium text-text-secondary hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
        ← My subjects
      </Link>
      <PageHeader title={`${group.subjectName}, ${group.armLabel}`}>{plural(group.students.length, "student")}.</PageHeader>
      <section aria-label="Students" className="rounded-3xl bg-surface p-2 shadow-raised sm:p-3">
        {group.students.length ? (
          <ol className="grid">
            {group.students.map((s, i) => (
              <li key={s.id} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl px-3 py-3">
                <span className="text-[13px] tabular-nums text-text-secondary">{i + 1}</span>
                <b className="truncate font-semibold">{s.fullName}</b>
                <span className="text-[12.5px] text-text-secondary">{s.admissionNo}</span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="p-4">
            <EmptyState title="No students yet">Students added to {group.armLabel} show here.</EmptyState>
          </div>
        )}
      </section>
    </div>
  );
}
