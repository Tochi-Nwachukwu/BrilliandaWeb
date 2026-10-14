import { formatScore, ordinal } from "@brillianda/core/grading";
import { RATING_LABELS } from "@brillianda/core/results";
import { SchoolMark } from "@/components/school/SchoolBrand";
import type { ReportCardData } from "@/data/types";
import { formatDate } from "@/lib/time";

/**
 * A student's report card (batch 15, after the first app's ReportCard). Plain and printable:
 * the browser's Print saves it as a PDF. Shared by admins, form teachers and (batch 16) parents.
 */
export function ReportCard({ card }: { card: ReportCardData }) {
  const a = card.attendance;
  return (
    <article className="report-card grid gap-5 rounded-3xl bg-surface p-5 shadow-raised sm:p-8 print:rounded-none print:p-0 print:shadow-none">
      <header className="flex flex-wrap items-center gap-4 border-b border-divider pb-4">
        <SchoolMark name={card.school.name} logoUrl={card.school.logoUrl} brandColor={card.school.brandColor} className="h-14 w-14 text-lg" />
        <div className="min-w-0 flex-1">
          <h2 className="text-[20px] font-semibold tracking-[-0.02em]">{card.school.name}</h2>
          <p className="text-sm text-text-secondary">
            Report card · {card.term.name}, {card.term.session}
          </p>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-[12.5px] text-text-secondary">Student</dt>
          <dd className="font-semibold">{card.student.fullName}</dd>
        </div>
        <div>
          <dt className="text-[12.5px] text-text-secondary">Admission number</dt>
          <dd className="font-medium">{card.student.admissionNo}</dd>
        </div>
        <div>
          <dt className="text-[12.5px] text-text-secondary">Class</dt>
          <dd className="font-medium">{card.student.armLabel}</dd>
        </div>
        <div>
          <dt className="text-[12.5px] text-text-secondary">Average{card.showPositions ? " and position" : ""}</dt>
          <dd className="font-semibold">
            {card.average ?? "—"}
            {card.showPositions && card.position ? ` · ${ordinal(card.position)} of ${card.of}` : ""}
          </dd>
        </div>
      </dl>

      {/* Focusable, so keyboard users can scroll it sideways on a phone. */}
      <div className="overflow-x-auto rounded-xl focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent" tabIndex={0} role="region" aria-label="Subjects and scores">
        <table className="w-full text-sm">
          <caption className="sr-only">Subjects</caption>
          <thead>
            <tr className="border-b border-divider text-left text-[12.5px] text-text-secondary">
              <th scope="col" className="py-2 pr-3 font-medium">
                Subject
              </th>
              {card.components.map((c) => (
                <th key={c.id} scope="col" className="px-2 py-2 text-center font-medium">
                  {c.name} <span className="font-normal">/{c.maxScore}</span>
                </th>
              ))}
              <th scope="col" className="px-2 py-2 text-center font-medium">
                Total
              </th>
              <th scope="col" className="px-2 py-2 text-center font-medium">
                Grade
              </th>
              <th scope="col" className="py-2 pl-2 font-medium">
                Remark
              </th>
            </tr>
          </thead>
          <tbody>
            {card.subjects.map((s) => (
              <tr key={s.name} className="border-b border-divider last:border-0">
                <th scope="row" className="py-2 pr-3 text-left font-medium">
                  {s.name}
                </th>
                {card.components.map((c) => (
                  <td key={c.id} className="px-2 py-2 text-center tabular-nums">
                    {formatScore(s.scores[c.id]) || "·"}
                  </td>
                ))}
                <td className="px-2 py-2 text-center font-semibold tabular-nums">{s.total ?? "·"}</td>
                <td className="px-2 py-2 text-center font-medium">{s.grade ?? "·"}</td>
                <td className="py-2 pl-2 text-text-secondary">{s.remark ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <section aria-labelledby="att" className="rounded-2xl bg-sunken p-4 text-sm">
          <h3 id="att" className="font-semibold">
            Attendance
          </h3>
          <p className="mt-1">{a && a.days ? `Present ${a.present} of ${a.days} school days (late ${a.late}, absent ${a.absent}).` : "No registers this term."}</p>
        </section>
        {card.ratings.length > 0 && (
          <section aria-labelledby="beh" className="rounded-2xl bg-sunken p-4 text-sm">
            <h3 id="beh" className="font-semibold">
              Behaviour
            </h3>
            <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
              {card.ratings.map((r) => (
                <div key={r.trait} className="contents">
                  <dt>{r.trait}</dt>
                  <dd className="text-right font-medium">{r.value ? `${r.value} ${RATING_LABELS[r.value - 1]}` : "—"}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>

      <section aria-label="Remarks" className="grid gap-3 text-sm">
        <p>
          <b className="font-semibold">Class teacher{card.formTeacher ? ` (${card.formTeacher})` : ""}:</b> {card.teacherRemark ?? "—"}
        </p>
        <p>
          <b className="font-semibold">Principal:</b> {card.principalRemark ?? "—"}
        </p>
        {card.nextTermBegins && (
          <p>
            <b className="font-semibold">Next term begins:</b> {formatDate(card.nextTermBegins)}
          </p>
        )}
      </section>

      <footer className="border-t border-divider pt-3 text-[12px] text-text-secondary">Grades: {card.scale.map((b) => `${b.grade} ${b.minScore}+ ${b.remark}`).join(" · ")}</footer>
    </article>
  );
}
