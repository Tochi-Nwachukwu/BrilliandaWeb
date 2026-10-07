import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

// Every flow runs at the plan's two sizes: a 360 px phone and a 1280 px laptop.
// Locally, a Chromium already on the machine can be used instead of downloading one:
// set PW_CHROMIUM to its path. CI installs Playwright's own browser.
const localChromium = process.env.PW_CHROMIUM;
const launchOptions = localChromium && existsSync(localChromium) ? { executablePath: localChromium } : {};

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3000",
    launchOptions,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "phone", use: { browserName: "chromium", viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true } },
    { name: "laptop", use: { browserName: "chromium", viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: "pnpm --filter web dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
