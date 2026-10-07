import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Same-origin API calls in development; no CORS setup needed.
    proxy: { "/api": "http://localhost:4000" },
  },
  build: {
    rollupOptions: {
      output: {
        // The libraries change far less often than our code, so they get their own long-cached file.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          data: ["@tanstack/react-query", "zustand"],
        },
      },
    },
  },
});
