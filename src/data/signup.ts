// Signup in progress (docs/data-contract.md). Screens import from here, never from fake/.
import "server-only";
import { LIVE } from "./api/client";
import { latestCode } from "./api/outbox";
import * as live from "./api/signup";
import * as fake from "./fake/signup";
import type { SignupDraft } from "./types";

// The API where it has endpoints (DATA_SOURCE=api), else sample data.
const impl = LIVE ? live : fake;

/** The signup this browser has under way, or null. Reads a cookie, so call it inside <Suspense>. */
export function getSignupDraft(): Promise<SignupDraft | null> {
  return impl.getSignupDraft();
}

/** Staging only: the code in the newest email to this address, from the API’s outbox (src/data/api/outbox.ts). Null otherwise. */
export function getOutboxCode(email: string): Promise<string | null> {
  return LIVE ? latestCode(email) : Promise.resolve(null);
}
