"use client";

import { useState, type ReactNode } from "react";
import { Button } from "./Button";
import { cx } from "./cx";
import { ResponsiveDialog } from "./ResponsiveDialog";

/**
 * Filters for a list (plan: "Sheet behind a Filter button that shows the active count" on phone,
 * "Inline filter bar" on laptop). The same controls render in both places; the parent owns their
 * state, so changing one in the sheet changes the list straight away.
 */
export function FilterSheet({
  activeCount,
  onClear,
  resultLabel,
  children,
}: {
  /** How many filters are set; shown on the phone button. */
  activeCount: number;
  onClear: () => void;
  /** e.g. "Show 32 students", for the sheet's main button. */
  resultLabel: string;
  /** The filter controls. */
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={activeCount ? `Filters, ${activeCount} on` : "Filters"}
          className={cx(
            "inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-medium shadow-raised focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent",
            activeCount ? "bg-accent-soft text-accent" : "bg-raise",
          )}
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" aria-hidden>
            <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
            <circle cx="16" cy="7" r="2" />
            <circle cx="10" cy="17" r="2" />
          </svg>
          Filter
          {activeCount > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[11.5px] font-semibold text-primary-text">{activeCount}</span>
          )}
        </button>
        <ResponsiveDialog
          open={open}
          onClose={() => setOpen(false)}
          title="Filter"
          footer={
            <>
              <Button variant="secondary" disabled={!activeCount} onClick={onClear}>
                Clear
              </Button>
              <Button onClick={() => setOpen(false)}>{resultLabel}</Button>
            </>
          }
        >
          <div className="grid gap-4">{children}</div>
        </ResponsiveDialog>
      </div>
      <div className="hidden flex-wrap items-center gap-3 md:flex">
        {children}
        {activeCount > 0 && (
          <button type="button" onClick={onClear} className="text-[13.5px] font-medium text-accent hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
            Clear filters
          </button>
        )}
      </div>
    </>
  );
}
