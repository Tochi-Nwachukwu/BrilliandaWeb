import type { Metadata } from "next";
import { moveStudents, setStudentsStatus } from "@/data/actions/students";
import { listStudents } from "@/data/students";
import { StudentsView } from "./StudentsView";

export const metadata: Metadata = { title: "Students" };

export default async function StudentsPage({ params }: PageProps<"/s/[school]/students">) {
  const { school } = await params;
  const list = await listStudents(school);
  if (!list) return null;
  return <StudentsView school={school} list={list} actions={{ moveStudents: moveStudents.bind(null, school), setStudentsStatus: setStudentsStatus.bind(null, school) }} />;
}
