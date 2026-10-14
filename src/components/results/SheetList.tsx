import { Badge } from "@brillianda/ui/Badge";
import { Icon } from "@brillianda/ui/Icon";
import Link from "next/link";
import type { SheetStatus, SheetSummary } from "@/data/types";

const STATUS: Record<SheetStatus, { label: string; tone: "neutral" | "warning" | "success" }> = {
  "not-started": { label: "Not started", tone: "neutral" },
  "in-progress": { label: "In progress", tone: "warning" },
  complete: { label: "Complete", tone: "success" },
};

/** Score sheets as a list: subject (or class), teacher, progress and status. */
export function SheetList({ sheets, hrefOf, show }: { sheets: SheetSummary[]; hrefOf: (s: SheetSummary) => string; show: "subject" | "class" }) {
  return (
    <ul className="grid gap-0.5 rounded-3xl bg-surface p-2 shadow-raised">
      {sheets.map((s) => (
        <li key={`${s.armId}-${s.subjectId}`}>
          <Link
            href={hrefOf(s)}
            className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-2xl p-3 hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
          >
            <span className="min-w-0">
              <b className="block truncate font-semibold">{show === "subject" ? s.subjectName : s.armLabel}</b>
              <span className="block truncate text-[13px] text-text-secondary">
                {show === "subject" ? (s.teacher ?? "No teacher yet") : s.subjectName} · {s.complete} of {s.of} students
                {s.unlockRequest ? " · asked to unlock" : ""}
              </span>
            </span>
            <Badge tone={s.unlockRequest ? "warning" : STATUS[s.status].tone}>{s.unlockRequest ? "Unlock asked" : STATUS[s.status].label}</Badge>
            <Icon name="chevron" className="h-4 w-4 text-text-muted" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
