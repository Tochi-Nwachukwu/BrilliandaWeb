"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Icon } from "./Icon";

/**
 * A short confirmation after an action ("Saved", "Invite sent"). One at a time; each new one
 * replaces the last. Announced politely to screen readers. An optional Undo action, for small
 * edits that apply at once (plan: "Small edits apply at once and show an Undo toast").
 */
type ToastState = { message: string | null; id: number; undo?: () => void };

let state: ToastState = { message: null, id: 0 };
const listeners = new Set<() => void>();
const emit = (next: ToastState) => {
  state = next;
  for (const listener of listeners) listener();
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};
const SERVER: ToastState = { message: null, id: 0 };

export const toast = (message: string, options: { undo?: () => void } = {}) => emit({ message, id: state.id + 1, undo: options.undo });

export function Toaster() {
  const { message, id, undo } = useSyncExternalStore(subscribe, () => state, () => SERVER);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => emit({ ...state, message: null, undo: undefined }), undo ? 6000 : 3600);
    return () => clearTimeout(timer);
  }, [message, id, undo]);

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-8">
      {message && (
        <div key={id} className="pointer-events-auto flex animate-pop items-center gap-2.5 rounded-full bg-primary py-2 pl-2 pr-5 text-sm font-medium text-primary-text shadow-float">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-success-bg text-success">
            <Icon name="check" className="h-4 w-4" strokeWidth={2.4} />
          </span>
          {message}
          {undo && (
            <button
              type="button"
              onClick={() => {
                undo();
                emit({ ...state, message: null, undo: undefined });
              }}
              className="-mr-2 ml-1 rounded-full px-3 py-1.5 font-semibold text-panel-accent hover:bg-panel-raised focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-panel-accent"
            >
              Undo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
