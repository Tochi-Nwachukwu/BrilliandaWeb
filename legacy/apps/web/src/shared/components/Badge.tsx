import type { EntryState, GradeBand } from "@brillanda/shared-types";
import type { ReactNode } from "react";
import { cx } from "../utils/cx";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info";

const BACKGROUND: Record<Tone, string> = {
  neutral: "bg-sunken",
  success: "bg-success-bg",
  warning: "bg-warning-bg",
  danger: "bg-danger-bg",
  info: "bg-info-bg",
};

const DOT: Record<Tone, string> = {
  neutral: "bg-text-muted",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

/** Small status pill: muted tint plus a coloured dot, with readable primary text. */
export function Badge({ tone = "neutral", children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className={cx(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium",
        BACKGROUND[tone],
      )}
    >
      <span aria-hidden className={cx("h-1.5 w-1.5 rounded-full", DOT[tone])} />
      {children}
    </span>
  );
}

const ENTRY_STATUS: Record<EntryState, [label: string, tone: Tone]> = {
  NOT_STARTED: ["Not started", "neutral"],
  IN_PROGRESS: ["In progress", "warning"],
  COMPLETE: ["Complete", "success"],
  LOCKED: ["Locked", "neutral"],
};

export function EntryStatusBadge({ status }: { status: EntryState }) {
  const [label, tone] = ENTRY_STATUS[status];
  return <Badge tone={tone}>{label}</Badge>;
}

/** For a grade letter alone (the parent portal): A and B success, C warning, the rest danger. */
export function gradeToneFromLetter(grade: string): Tone {
  const g = grade.trim().toUpperCase()[0];
  return g === "A" || g === "B" ? "success" : g === "C" ? "warning" : "danger";
}

/**
 * Grade colours by rank, so they follow each school's own scale: the top two passing grades
 * success, the third warning, the rest and fails danger (A/B, C, D/F on the default scale).
 */
export function gradeTone(band: GradeBand, scale: GradeBand[]): Tone {
  if (!band.isPass) return "danger";
  const rank = scale
    .filter((b) => b.isPass)
    .sort((a, b) => b.minScore - a.minScore)
    .findIndex((b) => b.minScore === band.minScore);
  return rank <= 1 ? "success" : rank === 2 ? "warning" : "danger";
}
