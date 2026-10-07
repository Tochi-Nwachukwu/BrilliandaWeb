"use client";

import { useEffect } from "react";

/**
 * Marks <html data-hydrated> once the page is interactive. Browser tests wait for it instead of
 * guessing from network traffic; it does nothing for people.
 */
export function Hydrated() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = "";
  }, []);
  return null;
}
