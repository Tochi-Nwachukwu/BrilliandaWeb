/**
 * True while some screens run on stand-in data (DECISIONS.md D-7): development builds unless
 * VITE_USE_MOCKS=false, and demo builds (VITE_DEMO=true, D-17). False in every other production build.
 */
export const USING_SAMPLE_DATA =
  (import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS !== "false") || import.meta.env.VITE_DEMO === "true";
