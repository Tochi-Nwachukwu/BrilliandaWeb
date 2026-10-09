import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { deleteStudent, setStudentsStatus } from "@/data/actions/students";
import { getStudent, listStudents } from "@/data/students";
import { StudentPage } from "./StudentPage";

export const metadata: Metadata = { title: "Student" };

export default async function StudentRoute({ params }: PageProps<"/s/[school]/students/[id]">) {
  const { school, id } = await params;
  // "3 days ago" depends on the time now.
  await connection();
  const [student, list] = await Promise.all([getStudent(school, id), listStudents(school)]);
  if (!student || !list) notFound();
  return (
    <StudentPage
      school={school}
      student={student}
      arm={list.arms.find((a) => a.id === student.armId) ?? null}
      now={new Date().getTime()}
      setStatus={setStudentsStatus.bind(null, school)}
      remove={deleteStudent.bind(null, school, id)}
    />
  );
}
