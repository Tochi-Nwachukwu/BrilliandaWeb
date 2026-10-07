import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";
import { sampleSignInHandlers } from "./sampleSignIn";

// In the browser only: the sample accounts' sign-in (tests supply their own sessions).
export const worker = setupWorker(...sampleSignInHandlers, ...handlers);
