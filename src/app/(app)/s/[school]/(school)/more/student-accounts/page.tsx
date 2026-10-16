import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import { connection } from "next/server";
import { inviteStudent, removeStudentAccess } from "@/data/actions/learners";
import { getStudentAccounts } from "@/data/learners";
import { StudentAccountsView } from "./StudentAccountsView";

export const metadata: Metadata = { title: "Student accounts" };

export default async function StudentAccountsPage({ params }: PageProps<"/s/[school]/more/student-accounts">) {
  const { school } = await params;
  await connection();
  const page = await getStudentAccounts(school);
  if (!page) return null;
  return (
    <div className="grid gap-4">
      <PageHeader title="Student accounts">Students sign in to see their timetable, attendance, results and book list, and to take tests.</PageHeader>
      <StudentAccountsView page={page} invite={inviteStudent.bind(null, school)} remove={removeStudentAccess.bind(null, school)} />
    </div>
  );
}
