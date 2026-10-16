"use client";

import type { Day } from "@brillianda/core/timetable";
import { EmptyState } from "@brillianda/ui/EmptyState";
import { WeekGrid } from "@/components/timetable/WeekGrid";
import type { ClassTimetable } from "@/data/types";

/** A student's class week (batch 23), read only. */
export function StudentWeek({ week, today }: { week: ClassTimetable; today: Day | null }) {
  if (!week.lessons.length) return <EmptyState title="No timetable yet">Your class’s lessons show here once the school fills in the timetable.</EmptyState>;
  return (
    <WeekGrid
      label={`${week.armLabel} timetable`}
      periods={week.periods}
      today={today}
      cell={(day, p) => {
        const l = week.lessons.find((x) => x.day === day && x.periodId === p.id);
        return l ? (
          <span className="block px-1.5 py-1 text-[13px] leading-snug">
            <b className="font-semibold">{l.subjectName}</b>
            {l.teacherName && <span className="block text-[12px] text-text-secondary">{l.teacherName}</span>}
          </span>
        ) : (
          <span className="block px-1.5 py-1 text-[13px] text-text-muted">Free</span>
        );
      }}
    />
  );
}
