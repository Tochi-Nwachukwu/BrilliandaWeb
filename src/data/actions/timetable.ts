"use server";

// The timetable (batch 22; docs/data-contract.md). Owners and admins only.
import { groupsSchema, lessonInputSchema, periodsSchema, timetableImportSchema, type Day } from "@brillianda/core/timetable";
import { fieldErrorsOf } from "@brillianda/core/signup";
import { LIVE } from "../api/client";
import * as live from "../api/timetable";
import * as fake from "../fake/timetable";
import type { ActionResult } from "../types";

// The API where it has endpoints (DATA_SOURCE=api), else sample data.
const impl = LIVE ? live : fake;

export async function saveBellSchedule(school: string, input: unknown): Promise<ActionResult<{ removed: number }>> {
  const parsed = periodsSchema.safeParse((input as { periods?: unknown })?.periods);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the periods.", fieldErrors: fieldErrorsOf(parsed.error) };
  const groupId = (input as { groupId?: unknown })?.groupId;
  return impl.saveBellSchedule(String(school), parsed.data, typeof groupId === "string" ? groupId : undefined);
}

/** Splits the timetable by class section (Primary, JSS, SSS), or joins it again. */
export async function saveTimetableGroups(school: string, input: unknown): Promise<ActionResult<{ removed: number }>> {
  const parsed = groupsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Please check the timetables.", fieldErrors: fieldErrorsOf(parsed.error) };
  return impl.saveTimetableGroups(String(school), parsed.data.groups);
}

export async function setLesson(school: string, armId: string, input: unknown): Promise<ActionResult<null>> {
  const parsed = lessonInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "That lesson couldn’t be saved." };
  return impl.setLesson(String(school), String(armId), parsed.data.day as Day, parsed.data.periodId, parsed.data.subjectId);
}

export async function importTimetable(school: string, input: unknown): Promise<ActionResult<{ classes: number; lessons: number }>> {
  const parsed = timetableImportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "This timetable couldn’t be read." };
  return impl.importTimetable(
    String(school),
    parsed.data.classes.map((c) => ({ armId: c.armId, lessons: c.lessons.map((l) => ({ ...l, day: l.day as Day })) })),
    parsed.data.fileName,
  );
}

export async function uploadTimetableFile(school: string, form: FormData): Promise<ActionResult<null>> {
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return { ok: false, error: "Choose a PDF to upload." };
  const groupId = form.get("groupId");
  return impl.setTimetableFile(String(school), file, typeof groupId === "string" && groupId ? groupId : undefined);
}

export async function removeTimetableFile(school: string, groupId?: string): Promise<ActionResult<null>> {
  return impl.removeTimetableFile(String(school), groupId ? String(groupId) : undefined);
}
