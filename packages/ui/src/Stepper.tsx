"use client";

import { cx } from "./cx";

/** A number with − and + buttons, 44 px targets: "How many arms?" on a phone. */
export function Stepper({
  label,
  value,
  min = 1,
  max = 10,
  onChange,
  size = "md",
}: {
  /** For screen readers, e.g. "Arms in JSS 1". */
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  size?: "sm" | "md";
}) {
  const button = cx(
    "grid shrink-0 place-items-center rounded-full bg-raise font-semibold shadow-raised transition-colors hover:bg-hover disabled:text-text-muted disabled:shadow-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent",
    size === "sm" ? "h-9 w-9 text-base" : "h-11 w-11 text-lg",
  );
  return (
    <div role="group" aria-label={label} className="inline-flex items-center gap-2">
      <button type="button" className={button} aria-label={`Fewer: ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        −
      </button>
      <output aria-live="polite" className={cx("min-w-8 text-center font-semibold tabular-nums", size === "sm" ? "text-base" : "text-xl")}>
        {value}
      </output>
      <button type="button" className={button} aria-label={`More: ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        +
      </button>
    </div>
  );
}
