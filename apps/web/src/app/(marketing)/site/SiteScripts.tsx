"use client";

import { useEffect } from "react";
import { startSite } from "./start";

/** Starts the page's motion, the live mark sheet and the trial form once the page has loaded. */
export function SiteScripts() {
  useEffect(() => {
    startSite();
  }, []);
  return null;
}
