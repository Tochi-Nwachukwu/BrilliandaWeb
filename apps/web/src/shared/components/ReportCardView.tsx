import { ordinal, type ReportCard } from "@brillanda/shared-types";
import { formatDate } from "../utils/time";

/** A report card laid out like the printed one. The school admin previews it; parents receive it. */
export function ReportCardView({ card }: { card: ReportCard }) {
  return (
    <div className="grid gap-5 rounded-[20px] bg-surface p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-divider pb-4">
        <div className="flex items-center gap-3">
          <span aria-hidden className="grid h-12 w-12 place-items-center rounded-2xl bg-primary font-semibold text-primary-text">
            {card.school.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
          </span>
          <div>
            <p className="text-[19px] font-semibold tracking-[-0.02em]">{card.school.name}</p>
            <p className="text-[12.5px] text-text-secondary">{[card.school.motto, card.school.address].filter(Boolean).join(". ")}</p>
          </div>
        </div>
        <p className="text-right text-[13px] text-text-secondary">
          <b className="block text-base font-semibold text-text-primary">Report card</b>
          {card.term.name}, {card.term.sessionName}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Student", card.student.fullName],
          ["Class", card.student.armName],
          ["Average", card.average.toFixed(2)],
          ["Position", card.position ? `${ordinal(card.position)} of ${card.of}` : "—"],
        ].map(([term, value]) => (
          <div key={term} className="rounded-2xl bg-sunken p-3">
            <dt className="text-xs text-text-secondary">{term}</dt>
            <dd className="m-0 text-lg font-semibold tracking-[-0.02em]">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-[13.5px]">
          <thead>
            <tr className="text-left text-xs text-text-muted">
              <th className="py-1.5 pr-2 font-medium">Subject</th>
              {card.subjects[0]?.scores.map((s) => (
                <th key={s.component} className="px-2 py-1.5 text-center font-medium">
                  {s.component} ({s.maxScore})
                </th>
              ))}
              <th className="px-2 py-1.5 text-center font-medium">Total</th>
              <th className="px-2 py-1.5 text-center font-medium">Grade</th>
              <th className="py-1.5 pl-2 font-medium">Remark</th>
            </tr>
          </thead>
          <tbody>
            {card.subjects.map((s) => (
              <tr key={s.subjectName} className="border-t border-divider">
                <td className="py-2 pr-2">{s.subjectName}</td>
                {s.scores.map((c) => (
                  <td key={c.component} className="px-2 py-2 text-center tabular-nums">{c.isAbsent ? "ABS" : c.value ?? "—"}</td>
                ))}
                <td className="px-2 py-2 text-center font-semibold tabular-nums">{s.total}</td>
                <td className="px-2 py-2 text-center">{s.grade}</td>
                <td className="py-2 pl-2 text-text-secondary">{s.remark}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <p className="rounded-2xl bg-sunken p-3.5 text-[13.5px]"><span className="block text-xs text-text-secondary">Class teacher</span>“{card.classTeacherRemark}”</p>
        <p className="rounded-2xl bg-sunken p-3.5 text-[13.5px]"><span className="block text-xs text-text-secondary">Principal</span>“{card.principalRemark}”</p>
      </div>
      <p className="text-xs text-text-secondary">
        Grading: {card.gradingScale.map((b) => `${b.grade} ${b.minScore} and above`).join(", ")}.
        {card.nextTermBegins ? ` Next term begins ${formatDate(card.nextTermBegins)}.` : ""}
      </p>
    </div>
  );
}
