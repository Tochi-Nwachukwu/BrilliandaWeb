"use client";

import { Button } from "@brillianda/ui/Button";
import { toast } from "@brillianda/ui/Toast";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { ActionResult } from "@/data/types";

/** Deletes a draft test nobody has started. */
export function DeleteTestButton({ remove, back }: { remove: () => Promise<ActionResult<null>>; back: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="danger-quiet"
      loading={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await remove();
          toast(result.ok ? "Draft deleted" : result.error);
          if (result.ok) router.push(back);
        })
      }
    >
      Delete
    </Button>
  );
}
