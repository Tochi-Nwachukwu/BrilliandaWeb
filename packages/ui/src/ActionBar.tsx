"use client";

import type { ReactNode } from "react";

/**
 * What to do with the rows someone has selected (plan: "Select mode, then an action bar at the
 * bottom" on phone, "an action bar on top" on laptop). Hidden while nothing is selected.
 */
export function ActionBar({ count, noun, onClear, children }: { count: number; noun: [one: string, many: string]; onClear: () => void; children: ReactNode }) {
  if (!count) return null;
  const label = `${count} ${count === 1 ? noun[0] : noun[1]} selected`;
  return (
    <div
      role="region"
      aria-label="Selected"
      className="fixed inset-x-3 bottom-[92px] z-30 flex animate-pop flex-wrap items-center gap-2 rounded-[22px] bg-primary p-2 pl-4 text-primary-text shadow-float md:sticky md:inset-x-auto md:bottom-auto md:top-3 md:mb-3"
    >
      <span aria-live="polite" className="mr-auto text-sm font-semibold">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5 [&_button]:bg-panel-raised [&_button]:text-primary-text">{children}</div>
      <button
        type="button"
        onClick={onClear}
        aria-label="Clear selection"
        className="grid h-10 w-10 place-items-center rounded-full text-panel-muted hover:bg-panel-raised hover:text-primary-text focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-panel-accent"
      >
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}
