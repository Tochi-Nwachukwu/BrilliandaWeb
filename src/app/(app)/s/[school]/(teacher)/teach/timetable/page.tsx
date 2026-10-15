import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import { connection } from "next/server";
import { getTimetable } from "@/data/timetable";
import { lagosWeekday } from "@/lib/time";
import { TeacherTimetable } from "./TeacherTimetable";

export const metadata: Metadata = { title: "Timetable" };

export default async function TeacherTimetablePage({ params }: PageProps<"/s/[school]/teach/timetable">) {
  const { school } = await params;
  await connection();
  const page = await getTimetable(school);
  if (!page) return null;
  return (
    <div className="grid gap-4">
      <PageHeader title="Timetable">Your lessons are highlighted.</PageHeader>
      <TeacherTimetable page={page} today={lagosWeekday()} />
    </div>
  );
}
