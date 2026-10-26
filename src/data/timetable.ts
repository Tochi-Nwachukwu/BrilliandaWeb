// The timetable (batch 22; docs/data-contract.md). Screens import from here, never from fake/.
import "server-only";
import type { Day, Period } from "@brillianda/core/timetable";
import * as live from "./api/timetable";
import * as fake from "./fake/timetable";
import { LIVE } from "./source";
import type { TimetablePage } from "./types";

// The API where it has endpoints (DATA_SOURCE=api), else sample data.
const impl = LIVE ? live : fake;

/** The whole school's timetable, for staff: owners and admins edit it; teachers see their lessons marked. */
export function getTimetable(subdomain: string): Promise<TimetablePage | null> {
  return impl.getTimetable(subdomain);
}

/** The signed-in teacher's lessons on a day (1 Monday to 5 Friday; null at weekends), in order. */
export function getMyLessonsToday(subdomain: string, day: Day | null): Promise<{ period: Period; armLabel: string; subjectName: string }[] | null> {
  return impl.getMyLessonsToday(subdomain, day);
}
