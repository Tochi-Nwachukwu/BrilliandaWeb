import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findGuardian, updateStudent } from "@/data/actions/students";
import { getStudent, listStudents } from "@/data/students";
import { EditStudent } from "./EditStudent";

export const metadata: Metadata = { title: "Edit student" };

export default async function EditStudentPage({ params }: PageProps<"/s/[school]/students/[id]/edit">) {
  const { school, id } = await params;
  const [student, list] = await Promise.all([getStudent(school, id), listStudents(school)]);
  if (!student || !list) notFound();
  return <EditStudent school={school} student={student} arms={list.arms} updateStudent={updateStudent.bind(null, school, id)} findGuardian={findGuardian.bind(null, school)} />;
}
