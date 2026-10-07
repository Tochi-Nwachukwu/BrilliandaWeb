import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/tokens.css";
import "./styles/global.css";

// Stand-in data for endpoints that aren't built yet (DECISIONS.md D-7), and in a demo build
// (VITE_DEMO=true, D-17). The condition is written inline so other production builds drop the
// mock code entirely.
async function startSampleData() {
  const sample = (import.meta.env.DEV && import.meta.env.VITE_USE_MOCKS !== "false") || import.meta.env.VITE_DEMO === "true";
  if (!sample) return;
  const { worker } = await import("./mocks/browser");
  await worker.start({ onUnhandledRequest: "bypass", quiet: true });
}

startSampleData().finally(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
