// The timetable, on the Brillianda API. Same functions and shapes as ../fake/timetable.ts. The API
// has one bell schedule and one document for the whole school, so here the school has a single
// timetable and splitting it by class section is switched off (`canSplit: false`) until the API
// has timetable groups (docs/backend-requirements.md, A4).
import "server-only";
import { SECTIONS, type Day, type GroupDraft, type Lesson, type Period } from "@brillianda/core/timetable";
import type { ActionResult, TimetablePage } from "../types";
import { api, fail, read } from "./client";
import { pictureOn } from "./school";

const id = encodeURIComponent;

type ApiPage = Omit<TimetablePage, "groups" | "canSplit"> & { periods: Period[]; file: NonNullable<TimetablePage["groups"][number]["file"]> | null };

export async function getTimetable(subdomain: string): Promise<TimetablePage | null> {
  const page = await read<ApiPage>(subdomain, "/v1/timetable");
  if (!page) return null;
  const { periods, file, ...rest } = page;
  // The PDF is served like the logo: on staging, through the school's /s/<school> path.
  const shown = file ? { ...file, url: pictureOn(subdomain, file.url) ?? file.url } : null;
  return { ...rest, canSplit: false, groups: [{ id: "all", name: "Whole school", sections: [...SECTIONS], periods, file: shown }] };
}

// The API has one bell schedule: a group id from the screens is ignored.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function saveBellSchedule(subdomain: string, periods: Period[], _groupId?: string): Promise<ActionResult<{ removed: number }>> {
  const result = await api<{ removed: number }>(subdomain, "/v1/timetable/periods", { method: "PUT", body: { periods } });
  return result.ok ? { ok: true, data: result.data } : fail(result);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function saveTimetableGroups(_subdomain: string, _groups: GroupDraft[]): Promise<ActionResult<{ removed: number }>> {
  return { ok: false, error: "Splitting the timetable by class isn’t switched on yet." };
}

export async function setLesson(subdomain: string, armId: string, day: Day, periodId: string, subjectId: string | null): Promise<ActionResult<null>> {
  const result = await api(subdomain, `/v1/timetable/${id(armId)}/${day}/${id(periodId)}`, { method: "PUT", body: { subjectId } });
  return result.ok ? { ok: true, data: null } : fail(result);
}

export async function importTimetable(subdomain: string, classes: { armId: string; lessons: Omit<Lesson, "armId">[] }[], fileName: string): Promise<ActionResult<{ classes: number; lessons: number }>> {
  const result = await api<{ classes: number; lessons: number }>(subdomain, "/v1/timetable/classes", { method: "PUT", body: { fileName, classes } });
  return result.ok ? { ok: true, data: result.data } : fail(result);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function setTimetableFile(subdomain: string, file: File, _groupId?: string): Promise<ActionResult<null>> {
  const form = new FormData();
  form.set("file", file);
  const result = await api(subdomain, "/v1/timetable/document", { method: "PUT", form });
  if (result.ok) return { ok: true, data: null };
  if (result.status === 413) return { ok: false, error: "That PDF is over 2 MB. Save a smaller copy and try again." };
  return fail(result);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function removeTimetableFile(subdomain: string, _groupId?: string): Promise<ActionResult<null>> {
  const result = await api(subdomain, "/v1/timetable/document", { method: "DELETE" });
  return result.ok ? { ok: true, data: null } : fail(result);
}

/** A teacher's lessons on a school day, in period order; none at weekends. */
export async function getMyLessonsToday(subdomain: string, day: Day | null): Promise<{ period: Period; armLabel: string; subjectName: string }[] | null> {
  if (!day) return [];
  return read(subdomain, "/v1/me/lessons", { day });
}
