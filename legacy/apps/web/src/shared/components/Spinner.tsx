import { cx } from "../utils/cx";

/** `onSolid` draws in the surrounding text colour, for use inside a filled button. */
export function Spinner({ className = "h-5 w-5", onSolid = false }: { className?: string; onSolid?: boolean }) {
  return (
    <span
      aria-hidden
      className={cx(
        "inline-block animate-spin rounded-full border-2",
        onSolid ? "border-current border-t-transparent" : "border-border-strong border-t-primary",
        className,
      )}
    />
  );
}

export function PageSpinner({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div role="status" className={cx("flex items-center justify-center", fullScreen ? "min-h-screen" : "py-16")}>
      <Spinner className="h-8 w-8" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
