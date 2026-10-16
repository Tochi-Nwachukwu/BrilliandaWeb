import { MARK_LABEL } from "@brillianda/core/attendance";
import { ordinal } from "@brillianda/core/grading";
import { shortTime } from "@brillianda/core/timetable";
import { Badge } from "@brillianda/ui/Badge";
import { Card } from "@brillianda/ui/Cards";
import { Icon } from "@brillianda/ui/Icon";
import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getStudentHome } from "@/data/learners";
import { formatShortDate, greeting } from "@/lib/time";

export const metadata: Metadata = { title: "Today" };

const TONE = { present: "success", late: "warning", absent: "danger" } as const;
const linkClass = "rounded text-sm font-medium text-accent hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent";

/** A student's Today (batch 23): their lessons, attendance and results. */
export default async function StudentToday({ params }: PageProps<"/s/[school]/learn">) {
  const { school } = await params;
  await connection();
  const home = await getStudentHome(school);
  if (!home) return null;
  const base = `/s/${school}/learn`;
  const a = home.attendance;

  return (
    <div className="grid gap-4">
      <PageHeader title={`${greeting()}, ${home.fullName.split(" ")[0]}`}>
        {home.armLabel} · {home.admissionNo}
        {home.formTeacher ? ` · Form teacher: ${home.formTeacher}` : ""}
      </PageHeader>

      {home.birthday && (
        <section aria-label="Birthday" className="flex items-start gap-4 rounded-[28px] p-5 shadow-raised sm:p-6" style={{ background: "var(--level-3-tint)", color: "var(--level-3-deep)" }}>
          <Icon name="cake" className="h-8 w-8 shrink-0" />
          <p className="text-[15px] font-medium leading-relaxed">{home.birthday}</p>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <Card
          title="Today’s lessons"
          action={
            <Link href={`${base}/timetable`} className={linkClass}>
              Timetable
            </Link>
          }
        >
          {home.lessonsToday.length ? (
            <ol className="grid gap-1.5" aria-label="Today’s lessons">
              {home.lessonsToday.map((l) => (
                <li key={l.start} className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3 rounded-2xl bg-sunken p-2.5 text-sm">
                  <span className="text-[12.5px] text-text-secondary">
                    {shortTime(l.start)}–{shortTime(l.end)}
                  </span>
                  <b className="font-semibold">{l.subjectName}</b>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-text-secondary">No lessons on the timetable today.</p>
          )}
        </Card>

        <div className="grid gap-4">
          <Card title="Results" description={home.results?.term}>
            {home.results?.published ? (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm">
                  Average <b className="text-[20px] font-semibold tabular-nums">{home.results.average ?? "—"}</b>
                  {home.results.position ? ` · ${ordinal(home.results.position)} of ${home.results.of}` : ""}
                </p>
                <Link href={`${base}/results`} className={linkClass}>
                  Your report card
                </Link>
              </div>
            ) : (
              <p className="text-sm text-text-secondary">{home.results ? "This term’s results aren’t out yet." : "Results come with the school term."}</p>
            )}
          </Card>

          <Card title="Attendance" description={a ? `${a.term}. Late counts as present.` : "Shown during term time."}>
            {a && a.days > 0 ? (
              <>
                <p className="text-sm">
                  Present <b className="text-[20px] font-semibold tabular-nums">{a.present}</b> of {a.days} days
                  {a.late ? ` (${a.late} late)` : ""}
                </p>
                <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Recent school days">
                  {home.recent.map((d) => (
                    <li key={d.date}>
                      <Badge tone={d.mark ? TONE[d.mark] : "neutral"}>
                        {formatShortDate(d.date)}: {d.mark ? MARK_LABEL[d.mark] : "Not taken"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-text-secondary">No registers taken yet this term.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
