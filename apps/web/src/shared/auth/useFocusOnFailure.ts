import { useEffect, type RefObject } from "react";

/**
 * When a submit fails, put the cursor where the person needs to be: the first field the server
 * marked invalid, or else the field tagged `data-focus-on-failure` (the password, on sign in).
 * Without it a failed attempt leaves focus on a button and they have to find their way back.
 */
export function useFocusOnFailure(formRef: RefObject<HTMLFormElement>, failure: unknown) {
  useEffect(() => {
    if (!failure) return;
    const form = formRef.current;
    const target =
      form?.querySelector<HTMLElement>('[aria-invalid="true"]') ??
      form?.querySelector<HTMLElement>("[data-focus-on-failure]");
    target?.focus();
  }, [failure, formRef]);
}
