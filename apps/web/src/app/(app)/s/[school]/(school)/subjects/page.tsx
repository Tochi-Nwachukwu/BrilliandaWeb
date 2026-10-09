import { EmptyState, PageHeader } from "@brillianda/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { addSubjects, removeSubject, renameSubject, setSubjectDepartment, setSubjectLink } from "@/data/actions/subjects";
import { getSubjectsSetup } from "@/data/subjects";
import { FirstSubjects } from "./FirstSubjects";
import { SubjectsView } from "./SubjectsView";

export const metadata: Metadata = { title: "Subjects" };

/** Classes first; then the first pick from the catalogue; then which classes take what. */
export default async function SubjectsPage({ params }: PageProps<"/s/[school]/subjects">) {
  const { school } = await params;
  const setup = await getSubjectsSetup(school);
  if (!setup) return null;

  if (!setup.levels.length) {
    return (
      <>
        <PageHeader title="Subjects" />
        <EmptyState title="Set up your classes first">
          Subjects attach to class levels, so add your classes, then come back.{" "}
          <Link href={`/s/${school}/classes`} className="font-medium text-accent hover:underline">
            Go to Classes
          </Link>
        </EmptyState>
      </>
    );
  }

  if (!setup.subjects.length) return <FirstSubjects catalogue={setup.catalogue} bands={setup.bands} add={addSubjects.bind(null, school)} />;

  return (
    <SubjectsView
      setup={setup}
      actions={{
        addSubjects: addSubjects.bind(null, school),
        renameSubject: renameSubject.bind(null, school),
        removeSubject: removeSubject.bind(null, school),
        setSubjectLink: setSubjectLink.bind(null, school),
        setSubjectDepartment: setSubjectDepartment.bind(null, school),
      }}
    />
  );
}
