"use client";

import { Button } from "@brillianda/ui/Button";
import { useEffect } from "react";

/**
 * Reloads by itself once the page can load again, or on a tap. The "online" event alone isn't
 * enough: it can fire before this script runs, and a phone can be "online" on Wi-Fi with no
 * internet. So it also checks every few seconds whether the page answers.
 */
export function RetryWhenOnline() {
  useEffect(() => {
    let stopped = false;
    const tryAgain = async () => {
      if (stopped || !navigator.onLine) return;
      try {
        const response = await fetch(window.location.href, { method: "HEAD", cache: "no-store" });
        if (response.ok && !stopped) window.location.reload();
      } catch {
        // Still offline; the next check will try again.
      }
    };
    window.addEventListener("online", tryAgain);
    const timer = window.setInterval(tryAgain, 5000);
    return () => {
      stopped = true;
      window.removeEventListener("online", tryAgain);
      window.clearInterval(timer);
    };
  }, []);
  return (
    <>
      <div className="mt-6">
        <Button size="lg" className="w-full" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </div>
      <p className="mt-3 text-[13px] text-text-secondary">It reloads by itself when you’re back online.</p>
    </>
  );
}
