import type { Metadata } from "next";
import { inviteTeacher, removeTeacher, setFormTeacher, setSubjectClasses } from "@/data/actions/teaching";
import { getTeachersPage } from "@/data/teaching";
import { TeachersView } from "./TeachersView";

export const metadata: Metadata = { title: "Teachers" };

export default async function TeachersPage({ params }: PageProps<"/s/[school]/teachers">) {
  const { school } = await params;
  const page = await getTeachersPage(school);
  if (!page) return null;
  return (
    <TeachersView
      page={page}
      invite={inviteTeacher.bind(null, school)}
      remove={removeTeacher.bind(null, school)}
      setForm={setFormTeacher.bind(null, school)}
      setSubjects={setSubjectClasses.bind(null, school)}
    />
  );
}
