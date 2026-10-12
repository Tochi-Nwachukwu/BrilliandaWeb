"use client";

import { Alert } from "@brillianda/ui/Alert";
import { Spinner } from "@brillianda/ui/Spinner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authLinkClass } from "@/components/auth/styles";
import type { ActionResult } from "@/data/types";

/** Trades the pass at once (it lasts a minute), then opens Home with its setup checklist. */
export function OpenSchool({ action, homeHref, loginHref }: { action: () => Promise<ActionResult<null>>; homeHref: string; loginHref: string }) {
  const router = useRouter();
  const [failure, setFailure] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // Once only: React runs effects twice in development, and the pass works once.
    if (started.current) return;
    started.current = true;
    action().then((result) => (result.ok ? router.replace(homeHref) : setFailure(result.error)));
  }, [action, homeHref, router]);

  if (failure) {
    return (
      <div className="grid gap-4">
        <Alert tone="warning">{failure}</Alert>
        <Link href={loginHref} className={authLinkClass}>
          Go to sign in
        </Link>
      </div>
    );
  }
  return (
    <p role="status" className="flex items-center gap-3 text-sm text-text-secondary">
      <Spinner />
      Opening your school…
    </p>
  );
}
