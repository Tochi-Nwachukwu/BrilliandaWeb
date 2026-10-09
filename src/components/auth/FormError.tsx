"use client";

import { Alert } from "@brillianda/ui/Alert";
import { cx } from "@brillianda/ui/cx";
import { useEffect, type RefObject } from "react";

/**
 * The one place a form's general error appears, just above its button. It opens by growing rather
 * than appearing, so the button moves out from under a finger instead of jumping.
 */
export function FormError({ message }: { message: string | null }) {
  return (
    <div className={cx("grid transition-[grid-template-rows,opacity] duration-150 ease-out", message ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")}>
      <div className="overflow-hidden">
        {message && (
          <div className="pb-4">
            <Alert tone="danger">{message}</Alert>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * When a submit fails, put the cursor where the person needs to be: the first field marked
 * invalid, or else the field tagged `data-focus-on-failure`.
 */
export function useFocusOnFailure(formRef: RefObject<HTMLFormElement | null>, failure: unknown) {
  useEffect(() => {
    if (!failure) return;
    const form = formRef.current;
    const target = form?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? form?.querySelector<HTMLElement>("[data-focus-on-failure]");
    target?.focus();
  }, [failure, formRef]);
}
