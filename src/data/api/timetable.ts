// The timetable, on the Brillianda API. Same functions and shapes as ../fake/timetable.ts.
import "server-only";
import type { Day, Lesson, Period } from "@brillianda/core/timetable";
import type { ActionResult, TimetablePage } from "../types";
import { api, fail, read } from "./client";
import { pictureOn } from "./school";

const id = encodeURIComponent;

export async function getTimetable(subdomain: string): Promise<TimetablePage | null> {
  const page = await read<TimetablePage>(subdomain, "/v1/timetable");
  // The PDF is served like the logo: on staging, through the school's /s/<school> path.
  return page?.file ? { ...page, file: { ...page.file, url: pictureOn(subdomain, page.file.url) ?? page.file.url } } : page;
}

export async function saveBellSchedule(subdomain: string, periods: Period[]): Promise<ActionResult<{ removed: number }>> {
  const result = await api<{ removed: number }>(subdomain, "/v1/timetable/periods", { method: "PUT", body: { periods } });
  return result.ok ? { ok: true, data: result.data } : fail(result);
}

export async function setLesson(subdomain: string, armId: string, day: Day, periodId: string, subjectId: string | null): Promise<ActionResult<null>> {
  const result = await api(subdomain, `/v1/timetable/${id(armId)}/${day}/${id(periodId)}`, { method: "PUT", body: { subjectId } });
  return result.ok ? { ok: true, data: null } : fail(result);
}

export async function importTimetable(subdomain: string, classes: { armId: string; lessons: Omit<Lesson, "armId">[] }[], fileName: string): Promise<ActionResult<{ classes: number; lessons: number }>> {
  const result = await api<{ classes: number; lessons: number }>(subdomain, "/v1/timetable/classes", { method: "PUT", body: { fileName, classes } });
  return result.ok ? { ok: true, data: result.data } : fail(result);
}

export async function setTimetableFile(subdomain: string, file: File): Promise<ActionResult<null>> {
  const form = new FormData();
  form.set("file", file);
  const result = await api(subdomain, "/v1/timetable/document", { method: "PUT", form });
  if (result.ok) return { ok: true, data: null };
  if (result.status === 413) return { ok: false, error: "That PDF is over 2 MB. Save a smaller copy and try again." };
  return fail(result);
}

export async function removeTimetableFile(subdomain: string): Promise<ActionResult<null>> {
  const result = await api(subdomain, "/v1/timetable/document", { method: "DELETE" });
  return result.ok ? { ok: true, data: null } : fail(result);
}

/** A teacher's lessons on a school day, in period order; none at weekends. */
export async function getMyLessonsToday(subdomain: string, day: Day | null): Promise<{ period: Period; armLabel: string; subjectName: string }[] | null> {
  if (!day) return [];
  return read(subdomain, "/v1/me/lessons", { day });
}
