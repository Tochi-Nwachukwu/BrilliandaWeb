"use client";

import { type Day } from "@brillianda/core/timetable";
import { cx } from "@brillianda/ui/cx";
import { EmptyState } from "@brillianda/ui/EmptyState";
import { SelectField } from "@brillianda/ui/TextField";
import { useState } from "react";
import { WeekGrid } from "@/components/timetable/WeekGrid";
import type { TimetablePage } from "@/data/types";

const pill = (active: boolean) =>
  cx(
    "inline-flex min-h-[40px] items-center rounded-full px-4 text-sm font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent",
    active ? "bg-primary text-primary-text" : "bg-raise shadow-raised hover:bg-hover",
  );

/** A teacher's timetable (batch 22): their own week, or any class's with their lessons highlighted. */
export function TeacherTimetable({ page, today }: { page: TimetablePage; today: Day | null }) {
  const mine = page.lessons.filter((l) => l.teacherId === page.me.userId);
  const myArms = [...new Set(mine.map((l) => l.armId))];
  const [view, setView] = useState<"mine" | "class">("mine");
  const [armId, setArmId] = useState(myArms[0] ?? page.arms[0]?.id ?? "");
  const subject = (id: string) => page.subjects.find((s) => s.id === id)?.name ?? "";
  const label = (id: string) => page.arms.find((a) => a.id === id)?.label ?? "";
  const at = (lessons: typeof page.lessons, day: Day, periodId: string) => lessons.filter((l) => l.day === day && l.periodId === periodId);

  return (
    <div className="grid gap-4">
      <div role="tablist" aria-label="Timetable" className="flex flex-wrap gap-2">
        <button type="button" role="tab" aria-selected={view === "mine"} onClick={() => setView("mine")} className={pill(view === "mine")}>
          My week
        </button>
        <button type="button" role="tab" aria-selected={view === "class"} onClick={() => setView("class")} className={pill(view === "class")}>
          A class
        </button>
      </div>

      {page.file && (
        <p className="text-sm text-text-secondary">
          The school also shared its timetable as a document:{" "}
          <a href={page.file.url} download={page.file.name} className="font-semibold text-accent underline underline-offset-2">
            {page.file.name}
          </a>
        </p>
      )}

      {view === "mine" ? (
        mine.length === 0 ? (
          <EmptyState title="No lessons on the timetable yet">Your lessons show here once the school fills in the timetable for the classes you teach.</EmptyState>
        ) : (
          <>
            <p className="text-sm text-text-secondary">
              {mine.length === 1 ? "1 lesson" : `${mine.length} lessons`} a week, in {myArms.length === 1 ? "1 class" : `${myArms.length} classes`}.
            </p>
            <WeekGrid
              label="My week"
              periods={page.periods}
              today={today}
              marked={(day, p) => at(mine, day, p.id).length > 0}
              cell={(day, p) => {
                const here = at(mine, day, p.id);
                return here.length ? (
                  <span className="block px-1.5 py-1 text-[13px] leading-snug">
                    {here.map((l) => (
                      <span key={l.armId} className="block">
                        <b className="font-semibold">{subject(l.subjectId)}</b>
                        <span className="block text-[12px] text-text-secondary">{label(l.armId)}</span>
                      </span>
                    ))}
                    {here.length > 1 && <span className="mt-0.5 block text-[12px] font-medium text-danger">Two classes at once: tell the school</span>}
                  </span>
                ) : (
                  <span className="block px-1.5 py-1 text-[13px] text-text-muted">Free</span>
                );
              }}
            />
          </>
        )
      ) : (
        <>
          <SelectField label="Class" value={armId} onChange={(e) => setArmId(e.target.value)} className="max-w-xs">
            {page.arms.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
                {myArms.includes(a.id) ? " (you teach here)" : ""}
              </option>
            ))}
          </SelectField>
          <WeekGrid
            label={`${label(armId)} timetable`}
            periods={page.periods}
            today={today}
            marked={(day, p) => at(mine, day, p.id).some((l) => l.armId === armId)}
            cell={(day, p) => {
              const lesson = page.lessons.find((l) => l.armId === armId && l.day === day && l.periodId === p.id);
              if (!lesson) return <span className="block px-1.5 py-1 text-[13px] text-text-muted">Free</span>;
              const yours = lesson.teacherId === page.me.userId;
              return (
                <span className="block px-1.5 py-1 text-[13px] leading-snug">
                  <b className="font-semibold">{subject(lesson.subjectId)}</b>
                  <span className={cx("block text-[12px]", yours ? "font-semibold text-accent" : "text-text-secondary")}>{yours ? "You" : (lesson.teacherName ?? "No teacher yet")}</span>
                </span>
              );
            }}
          />
        </>
      )}
    </div>
  );
}
