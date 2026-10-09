"use client";

import { Button } from "@brillianda/ui/Button";
import { useEffect } from "react";

/** Reloads by itself the moment the connection is back, or on a tap. */
export function RetryWhenOnline() {
  useEffect(() => {
    const reload = () => window.location.reload();
    window.addEventListener("online", reload);
    return () => window.removeEventListener("online", reload);
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
