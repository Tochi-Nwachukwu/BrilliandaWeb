"use client";

import { useEffect } from "react";

/**
 * Registers public/sw.js, which shows a saved offline page instead of the browser's error when
 * there's no connection (plan: the app shell). Production only: in development it would keep
 * serving old files.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => registration.active?.postMessage("refresh-offline-page"))
      .catch(() => undefined);
  }, []);
  return null;
}
