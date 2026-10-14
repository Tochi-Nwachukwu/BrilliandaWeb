"use client";

import { Button } from "@brillianda/ui/Button";
import { toast } from "@brillianda/ui/Toast";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { ActionResult } from "@/data/types";

/** Publish a class's results (parents see them), or take them back to correct something. */
export function PublishButton({ label, published, ready, setPublished }: { label: string; published: boolean; ready: boolean; setPublished: (publish: boolean) => Promise<ActionResult<null>> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const run = (publish: boolean) =>
    startTransition(async () => {
      const result = await setPublished(publish);
      toast(result.ok ? (publish ? `${label} results published` : `${label} results taken back`) : result.error);
      if (result.ok) router.refresh();
    });
  return published ? (
    <Button variant="secondary" loading={pending} onClick={() => run(false)}>
      Take back results
    </Button>
  ) : (
    <Button loading={pending} disabled={!ready} onClick={() => run(true)} title={ready ? undefined : "Every subject must be complete first"}>
      Publish results
    </Button>
  );
}

/** The browser's own print, which also saves a PDF. */
export function PrintButton() {
  return (
    <Button variant="secondary" onClick={() => window.print()} className="print:hidden">
      Print or save as PDF
    </Button>
  );
}
