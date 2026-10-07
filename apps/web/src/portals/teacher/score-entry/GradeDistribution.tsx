import { resolveGrade, type GradeBand } from "@brillanda/shared-types";
import { cx } from "../../../shared/utils/cx";

const PLOT_HEIGHT_PX = 44;

/**
 * Grades of the students whose scores are all in, as columns that grow while the teacher types.
 * One series, so no legend: the caption names it. Counts sit on the column caps, and each column
 * has a hover title; the grid below is the full table view.
 */
export function GradeDistribution({ totals, scale }: { totals: number[]; scale: GradeBand[] }) {
  const bands = [...scale].sort((a, b) => b.minScore - a.minScore);
  const counts = new Map(bands.map((band) => [band.grade, 0]));
  for (const total of totals) {
    try {
      const { grade } = resolveGrade(total, scale);
      counts.set(grade, (counts.get(grade) ?? 0) + 1);
    } catch {
      // A scale without a band at 0 is a configuration error, surfaced elsewhere.
    }
  }
  const largest = Math.max(1, ...counts.values());
  const summary = bands.map((band) => `${band.grade}: ${counts.get(band.grade) ?? 0}`).join(", ");

  return (
    <figure className="shrink-0">
      <figcaption className="mb-3 text-sm text-text-secondary">Grades so far</figcaption>
      <p className="sr-only">{totals.length === 0 ? "No students have all their scores in yet." : summary}</p>
      <div aria-hidden className="flex items-end gap-3">
        {bands.map((band) => {
          const count = counts.get(band.grade) ?? 0;
          return (
            <div
              key={band.grade}
              className="flex w-6 flex-col items-center"
              title={`${band.grade} (${band.remark}): ${count} ${count === 1 ? "student" : "students"}`}
            >
              <span className={cx("mb-1 text-xs tabular-nums", count > 0 ? "text-text-secondary" : "text-text-muted")}>
                {count}
              </span>
              <div className="flex w-full items-end" style={{ height: PLOT_HEIGHT_PX }}>
                <div
                  className={cx(
                    "w-full rounded-t-[4px] transition-[height] duration-500 ease-out",
                    count > 0 ? "bg-chart" : "bg-border",
                  )}
                  style={{ height: count > 0 ? Math.max(4, (count / largest) * PLOT_HEIGHT_PX) : 2 }}
                />
              </div>
              <span className="mt-1.5 text-xs font-medium">{band.grade}</span>
            </div>
          );
        })}
      </div>
    </figure>
  );
}
