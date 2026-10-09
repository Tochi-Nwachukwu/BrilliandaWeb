// Signup in progress (docs/data-contract.md). Screens import from here, never from fake/.
import "server-only";
import * as impl from "./fake/signup";
import type { SignupDraft } from "./types";

/** The signup this browser has under way, or null. Reads a cookie, so call it inside <Suspense>. */
export function getSignupDraft(): Promise<SignupDraft | null> {
  return impl.getSignupDraft();
}
