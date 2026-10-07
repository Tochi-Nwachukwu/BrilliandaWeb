import { defineConfig } from "vite";

// The marketing site: plain HTML, CSS and TypeScript, no framework (DECISIONS.md D-10).
export default defineConfig({
  server: {
    port: 5174,
    // The trial form posts to the API in development.
    proxy: { "/api": "http://localhost:4000" },
  },
  build: {
    target: "es2020",
    assetsInlineLimit: 2048,
  },
});
