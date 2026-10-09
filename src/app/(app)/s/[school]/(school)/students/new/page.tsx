import type { Metadata } from "next";
import { addStudent, findGuardian } from "@/data/actions/students";
import { listStudents } from "@/data/students";
import { AddStudent } from "./AddStudent";

export const metadata: Metadata = { title: "Add a student" };

export default async function NewStudentPage({ params, searchParams }: PageProps<"/s/[school]/students/new">) {
  const { school } = await params;
  const { arm } = await searchParams;
  const list = await listStudents(school);
  if (!list) return null;
  return (
    <AddStudent
      school={school}
      arms={list.arms}
      armId={typeof arm === "string" ? arm : ""}
      nextAdmissionNo={list.nextAdmissionNo}
      addStudent={addStudent.bind(null, school)}
      findGuardian={findGuardian.bind(null, school)}
    />
  );
}
