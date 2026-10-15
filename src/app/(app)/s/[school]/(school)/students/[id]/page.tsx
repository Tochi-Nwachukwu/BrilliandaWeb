import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { inviteParent } from "@/data/actions/parents";
import { deleteStudent, setStudentsStatus } from "@/data/actions/students";
import { getReportTerms } from "@/data/reports";
import { LIVE } from "@/data/source";
import { getStudent, listStudents } from "@/data/students";
import { StudentPage } from "./StudentPage";

export const metadata: Metadata = { title: "Student" };

export default async function StudentRoute({ params }: PageProps<"/s/[school]/students/[id]">) {
  const { school, id } = await params;
  // "3 days ago" depends on the time now.
  await connection();
  const [student, list, reportTerms] = await Promise.all([getStudent(school, id), listStudents(school), getReportTerms(school, id)]);
  if (!student || !list) notFound();
  return (
    <StudentPage
      school={school}
      student={student}
      arm={list.arms.find((a) => a.id === student.armId) ?? null}
      now={new Date().getTime()}
      setStatus={setStudentsStatus.bind(null, school)}
      remove={deleteStudent.bind(null, school, id)}
      reportTerms={reportTerms ?? []}
      // The parent app and registers aren’t on the API yet.
      inviteParent={LIVE ? undefined : inviteParent.bind(null, school, student.guardian?.id ?? "")}
      showAttendance={!LIVE}
    />
  );
}
