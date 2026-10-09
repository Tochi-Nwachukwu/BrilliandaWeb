"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

/**
 * Says so plainly when the phone loses its connection (plan: the offline banner), so nobody types
 * a student's details into a form that can't be saved. Goes away by itself when it comes back.
 */
export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
  if (online) return null;
  return (
    <div role="status" className="fixed inset-x-3 top-3 z-[60] mx-auto flex max-w-md animate-pop items-center gap-2.5 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-text shadow-float">
      <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-warning" />
      You’re offline. You can look around, but changes won’t save until you’re back.
    </div>
  );
}
