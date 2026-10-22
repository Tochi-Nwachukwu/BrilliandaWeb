import { Card } from "@brillianda/ui/Cards";
import { EmptyState } from "@brillianda/ui/EmptyState";
import { Icon } from "@brillianda/ui/Icon";
import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { shortTime } from "@brillianda/core/timetable";
import { getTeacherHome } from "@/data/teaching";
import { getMyLessonsToday } from "@/data/timetable";
import { greeting, lagosWeekday, plural } from "@/lib/time";
import { schoolBase } from "@/lib/schoolBase";

export const metadata: Metadata = { title: "Today" };

const linkClass = "rounded-2xl focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent";

/** A teacher's Today: is the register in, and the subjects they teach. */
export default async function TeacherToday({ params }: PageProps<"/s/[school]/teach">) {
  const { school } = await params;
  const sb = await schoolBase(school);
  await connection();
  const [home, lessons] = await Promise.all([getTeacherHome(school), getMyLessonsToday(school, lagosWeekday())]);
  if (!home) return null;
  const base = `${sb}/teach`;
  const first = home.fullName.split(" ")[0];
  const isFormTeacher = home.formArms.length > 0;
  // Not every teacher is a form teacher: many only teach subjects across classes.
  if (!isFormTeacher && home.subjects.length === 0) {
    return (
      <div className="grid gap-4">
        <PageHeader title={`${greeting()}, ${first}`} />
        <div className="rounded-3xl bg-surface p-6 shadow-raised">
          <EmptyState title="No classes yet">When your school gives you subjects to teach, or makes you a form teacher, they show here.</EmptyState>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <PageHeader title={`${greeting()}, ${first}`}>
        {!isFormTeacher ? "The classes you teach, and their students." : home.today ? "Here’s what needs you today." : "No school today. This term’s registers stay open to change."}
      </PageHeader>

      {lessons && lessons.length > 0 && (
        <Card
          title="Your lessons today"
          action={
            <Link href={`${base}/timetable`} className="rounded text-sm font-medium text-accent hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
              Timetable
            </Link>
          }
        >
          <ol className="grid gap-1.5" aria-label="Your lessons today">
            {lessons.map((l) => (
              <li key={`${l.period.id}-${l.armLabel}`} className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-3 rounded-2xl bg-sunken p-2.5 text-sm">
                <span className="text-[12.5px] text-text-secondary">{shortTime(l.period.start)}–{shortTime(l.period.end)}</span>
                <span className="min-w-0">
                  <b className="font-semibold">{l.subjectName}</b> <span className="text-text-secondary">· {l.armLabel}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {isFormTeacher && (
      <Card title="Your register" description="Once a day, for your form class. You can change it afterwards.">
        {home.formArms.length ? (
          <ul className="grid gap-2">
            {home.formArms.map((arm) => {
              const due = home.today !== null && !arm.takenToday;
              return (
                <li key={arm.armId}>
                  <Link href={`${base}/register?arm=${arm.armId}`} className={`${linkClass} grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-3.5 bg-sunken p-3.5 hover:bg-hover`}>
                    <span aria-hidden className={`grid h-11 w-11 place-items-center rounded-2xl ${due ? "bg-warning-bg text-warning" : "bg-success-bg text-success"}`}>
                      <Icon name={due ? "clock" : "check"} className="h-5 w-5" />
                    </span>
                    <span className="min-w-0">
                      <b className="block font-semibold">{arm.label}</b>
                      <span className="block text-[13px] text-text-secondary">
                        {home.today ? (arm.takenToday ? "Today’s register is in." : "Today’s register isn’t taken yet.") : `${plural(arm.students, "student")}.`} {arm.takenThisTerm} of{" "}
                        {plural(arm.daysThisTerm, "school day")} this term.
                      </span>
                    </span>
                    <span className={`rounded-full px-4 py-2 text-[13px] font-medium ${due ? "bg-primary text-primary-text" : "bg-raise shadow-raised"}`}>{due ? "Take it" : "Open"}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          null
        )}
      </Card>
      )}

      <Card title="Your subjects" description={home.subjects.length ? "Each class you teach, with its students. Scores come in a later version." : undefined}>
        {home.subjects.length ? (
          <ul className="grid gap-1 sm:grid-cols-2">
            {home.subjects.map((s) => (
              <li key={`${s.armId}-${s.subjectId}`}>
                <Link href={`${base}/subjects/${s.armId}/${s.subjectId}`} className={`${linkClass} flex items-center justify-between gap-3 p-3 hover:bg-hover`}>
                  <span className="min-w-0">
                    <b className="block truncate font-semibold">{s.subjectName}</b>
                    <span className="block text-[13px] text-text-secondary">
                      {s.label} · {plural(s.students, "student")}
                    </span>
                  </span>
                  <Icon name="chevron" className="h-4 w-4 shrink-0 text-text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No subjects yet">When your school gives you subjects to teach, each class shows here.</EmptyState>
        )}
      </Card>
    </div>
  );
}
