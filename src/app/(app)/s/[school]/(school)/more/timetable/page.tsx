import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import { connection } from "next/server";
import { schoolFromParams } from "@/components/school/school";
import { importTimetable, removeTimetableFile, saveBellSchedule, setLesson, uploadTimetableFile } from "@/data/actions/timetable";
import { getTimetable } from "@/data/timetable";
import { lagosWeekday } from "@/lib/time";
import { TimetableEditor } from "./TimetableEditor";

export const metadata: Metadata = { title: "Timetable" };

export default async function TimetablePage({ params }: PageProps<"/s/[school]/more/timetable">) {
  const { school: subdomain } = await params;
  await connection();
  const [school, page] = await Promise.all([schoolFromParams(params), getTimetable(subdomain)]);
  if (!page) return null;
  const s = school.subdomain;
  return (
    <div className="grid gap-4">
      <PageHeader title="Timetable">Each class’s week, by the school’s bell schedule. Teachers see it with their own lessons highlighted.</PageHeader>
      <TimetableEditor
        page={page}
        schoolName={school.name}
        today={lagosWeekday()}
        now={new Date().getTime()}
        actions={{
          setLesson: setLesson.bind(null, s),
          saveBells: saveBellSchedule.bind(null, s),
          importFile: importTimetable.bind(null, s),
          uploadPdf: uploadTimetableFile.bind(null, s),
          removePdf: removeTimetableFile.bind(null, s),
        }}
      />
    </div>
  );
}
