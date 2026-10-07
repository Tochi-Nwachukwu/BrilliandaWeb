import type { ReactNode } from "react";
import { cx } from "../utils/cx";

const R = 26;
const LENGTH = 2 * Math.PI * R;

/** A progress ring that draws itself in. `label` sits in the middle; decorative unless labelled. */
export function Ring({
  value,
  color = "var(--color-chart)",
  track = "var(--color-sunken)",
  label,
  className = "h-16 w-16",
}: {
  /** 0 to 1. */
  value: number;
  color?: string;
  track?: string;
  label?: ReactNode;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cx("shrink-0", className)}>
      <circle cx="32" cy="32" r={R} fill="none" strokeWidth={7} style={{ stroke: track }} />
      <circle
        cx="32"
        cy="32"
        r={R}
        fill="none"
        strokeWidth={7}
        strokeLinecap="round"
        strokeDasharray={`${(LENGTH * clamped).toFixed(1)} ${LENGTH.toFixed(1)}`}
        transform="rotate(-90 32 32)"
        className="animate-ring-draw"
        style={{ stroke: color }}
      />
      {label !== undefined && (
        <text x="32" y="37" textAnchor="middle" className="fill-current text-[14px] font-semibold">
          {label}
        </text>
      )}
    </svg>
  );
}
