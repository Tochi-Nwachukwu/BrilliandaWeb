import { ordinal } from "@brillianda/core/grading";
import Link from "next/link";
import type { Broadsheet } from "@/data/types";

/**
 * A class's broadsheet (batch 15): students down, subjects across, each cell the subject total and
 * grade. It scrolls sideways on a phone, with the names kept in view.
 */
export function BroadsheetTable({ sheet, reportHref }: { sheet: Broadsheet; reportHref: (studentId: string) => string }) {
  return (
    <div className="overflow-x-auto rounded-3xl bg-surface shadow-raised">
      <table className="w-full border-separate border-spacing-0 text-sm">
        <caption className="sr-only">
          {sheet.armLabel} broadsheet, {sheet.term.name}
        </caption>
        <thead>
          <tr className="text-left text-[12.5px] text-text-secondary">
            <th scope="col" className="sticky left-0 z-10 bg-surface px-4 py-3 font-medium">
              Student
            </th>
            {sheet.subjects.map((s) => (
              <th key={s.id} scope="col" className="px-2 py-3 text-center font-medium" title={s.name}>
                {s.code}
                {s.status !== "complete" && <span className="block text-[11px] font-normal">not complete</span>}
              </th>
            ))}
            <th scope="col" className="px-3 py-3 text-right font-medium">
              Average
            </th>
            {sheet.showPositions && (
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Position
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sheet.rows.map((r) => (
            <tr key={r.studentId} className="odd:bg-[color-mix(in_oklab,var(--color-sunken)_55%,transparent)]">
              <th scope="row" className="sticky left-0 z-10 bg-inherit px-4 py-2.5 text-left font-semibold [background:inherit]">
                <Link href={reportHref(r.studentId)} className="underline-offset-2 hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
                  {r.fullName}
                </Link>
              </th>
              {sheet.subjects.map((s) => {
                const cell = r.cells[s.id];
                return (
                  <td key={s.id} className="px-2 py-2.5 text-center tabular-nums">
                    {cell === "excluded" ? (
                      <span className="text-text-secondary" title="Doesn’t take this subject">
                        –
                      </span>
                    ) : cell ? (
                      <>
                        {cell.total} <span className="text-[12px] text-text-secondary">{cell.grade}</span>
                      </>
                    ) : (
                      <span className="text-text-secondary">·</span>
                    )}
                  </td>
                );
              })}
              <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{r.average ?? "—"}</td>
              {sheet.showPositions && <td className="px-4 py-2.5 text-right tabular-nums">{r.position ? ordinal(r.position) : "—"}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
