import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    environmentOptions: { jsdom: { url: "http://localhost:5173" } },
    // The same stand-in API the dev server uses, served in-process by MSW.
    setupFiles: ["src/test/setup.ts"],
    css: false,
  },
});
