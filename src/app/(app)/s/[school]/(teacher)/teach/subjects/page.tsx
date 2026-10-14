import { EmptyState } from "@brillianda/ui/EmptyState";
import { Icon } from "@brillianda/ui/Icon";
import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getTeacherHome } from "@/data/teaching";
import type { TeacherHome } from "@/data/types";
import { plural } from "@/lib/time";

export const metadata: Metadata = { title: "My subjects" };

/** Every subject class a teacher teaches, grouped by subject. */
export default async function TeacherSubjects({ params }: PageProps<"/s/[school]/teach/subjects">) {
  const { school } = await params;
  await connection();
  const home = await getTeacherHome(school);
  if (!home) return null;
  const bySubject = new Map<string, TeacherHome["subjects"]>();
  for (const s of home.subjects) bySubject.set(s.subjectId, [...(bySubject.get(s.subjectId) ?? []), s]);

  return (
    <div className="grid gap-4">
      <PageHeader title="My subjects">The classes you teach, with their students. Scores and report cards come in a later version.</PageHeader>
      {bySubject.size === 0 ? (
        <div className="rounded-3xl bg-surface p-6 shadow-raised">
          <EmptyState title="No subjects yet">When your school gives you subjects to teach, each class shows here.</EmptyState>
        </div>
      ) : (
        [...bySubject].map(([subjectId, classes]) => (
          <section key={subjectId} aria-labelledby={`subject-${subjectId}`} className="rounded-3xl bg-surface p-5 shadow-raised sm:p-6">
            <h2 id={`subject-${subjectId}`} className="mb-3 text-[17px] font-semibold tracking-[-0.02em]">
              {classes[0]!.subjectName}
            </h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {classes.map((c) => (
                <li key={c.armId}>
                  <Link
                    href={`/s/${school}/teach/subjects/${c.armId}/${c.subjectId}`}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-sunken p-3.5 hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <span>
                      <b className="block font-semibold">{c.label}</b>
                      <span className="text-[13px] text-text-secondary">{plural(c.students, "student")}</span>
                    </span>
                    <Icon name="chevron" className="h-4 w-4 text-text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
