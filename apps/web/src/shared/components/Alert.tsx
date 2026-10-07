import type { ReactNode } from "react";
import { cx } from "../utils/cx";

// A soft tint and a small dot carry the tone; body text stays primary so it meets WCAG AA
// (the warning token is too light for text, DECISIONS.md F-34). No edge bars or outlines.
const BACKGROUND = {
  info: "bg-field",
  success: "bg-success-bg",
  warning: "bg-warning-bg",
  danger: "bg-danger-bg",
};

const DOT = {
  info: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

type AlertProps = { tone?: keyof typeof BACKGROUND; children: ReactNode; action?: ReactNode };

export function Alert({ tone = "info", children, action }: AlertProps) {
  return (
    <div
      role={tone === "danger" || tone === "warning" ? "alert" : "status"}
      className={cx("flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm", BACKGROUND[tone])}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span aria-hidden className={cx("mt-1.5 h-2 w-2 shrink-0 rounded-full", DOT[tone])} />
        <div className="min-w-0">{children}</div>
      </div>
      {action}
    </div>
  );
}
