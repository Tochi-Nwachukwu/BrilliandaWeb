// The timetable, on the Brillianda API. Same functions and shapes as ../fake/timetable.ts: the
// school's timetables (groups of class sections, each with its own bell schedule and document).
import "server-only";
import type { Day, GroupDraft, Lesson, Period } from "@brillianda/core/timetable";
import type { ActionResult, TimetablePage } from "../types";
import { api, fail, read } from "./client";
import { pictureOn } from "./school";

const id = encodeURIComponent;

export async function getTimetable(subdomain: string): Promise<TimetablePage | null> {
  // The API still sends the first timetable's periods and file at the top as well; the groups are what count.
  const page = await read<TimetablePage & { periods?: unknown; file?: unknown }>(subdomain, "/v1/timetable");
  if (!page) return null;
  const { periods: _periods, file: _file, ...rest } = page;
  void _periods;
  void _file;
  // Each PDF is served like the logo: on staging, through the school's /s/<school> path.
  return { ...rest, groups: rest.groups.map((g) => (g.file ? { ...g, file: { ...g.file, url: pictureOn(subdomain, g.file.url) ?? g.file.url } } : g)) };
}

/** One timetable's bell schedule (the first when none is named). */
export async function saveBellSchedule(subdomain: string, periods: Period[], groupId?: string): Promise<ActionResult<{ removed: number }>> {
  const path = groupId ? `/v1/timetable/groups/${id(groupId)}/periods` : "/v1/timetable/periods";
  const result = await api<{ removed: number }>(subdomain, path, { method: "PUT", body: { periods } });
  return result.ok ? { ok: true, data: result.data } : fail(result);
}

/** Splits the timetable by class section, or joins it again. */
export async function saveTimetableGroups(subdomain: string, groups: GroupDraft[]): Promise<ActionResult<{ removed: number }>> {
  const result = await api<{ removed: number }>(subdomain, "/v1/timetable/groups", { method: "PUT", body: { groups } });
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

/** A timetable's PDF (the first timetable's when none is named). */
export async function setTimetableFile(subdomain: string, file: File, groupId?: string): Promise<ActionResult<null>> {
  const form = new FormData();
  form.set("file", file);
  const path = groupId ? `/v1/timetable/groups/${id(groupId)}/document` : "/v1/timetable/document";
  const result = await api(subdomain, path, { method: "PUT", form });
  if (result.ok) return { ok: true, data: null };
  if (result.status === 413) return { ok: false, error: "That PDF is over 2 MB. Save a smaller copy and try again." };
  return fail(result);
}

export async function removeTimetableFile(subdomain: string, groupId?: string): Promise<ActionResult<null>> {
  const path = groupId ? `/v1/timetable/groups/${id(groupId)}/document` : "/v1/timetable/document";
  const result = await api(subdomain, path, { method: "DELETE" });
  return result.ok ? { ok: true, data: null } : fail(result);
}

/** A teacher's lessons on a school day, in time order; none at weekends. */
export async function getMyLessonsToday(subdomain: string, day: Day | null): Promise<{ period: Period; armLabel: string; subjectName: string }[] | null> {
  if (!day) return [];
  return read(subdomain, "/v1/me/lessons", { day });
}
