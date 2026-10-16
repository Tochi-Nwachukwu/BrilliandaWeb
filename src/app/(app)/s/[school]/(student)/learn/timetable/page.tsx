import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getStudentTimetable } from "@/data/learners";
import { lagosWeekday } from "@/lib/time";
import { StudentWeek } from "./StudentWeek";

export const metadata: Metadata = { title: "Timetable" };

export default async function StudentTimetablePage({ params }: PageProps<"/s/[school]/learn/timetable">) {
  const { school } = await params;
  await connection();
  const week = await getStudentTimetable(school);
  if (!week) return null;
  return (
    <div className="grid gap-4">
      <PageHeader title="Timetable">{week.armLabel}’s week.</PageHeader>
      <StudentWeek week={week} today={lagosWeekday()} />
    </div>
  );
}
