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
  // Generous for a small machine running two browsers against one server.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3100",
    launchOptions,
    trace: "retain-on-failure",
  },
  // Every test runs on a phone. The laptop run takes only those tagged @both: the plan's main
  // flows and the checks where layout matters (accessibility, speed, navigation, the laptop grid).
  // Rules that don't depend on the screen (wrong passwords, filters, validation) run once.
  projects: [
    { name: "phone", testIgnore: /budget.spec/, use: { browserName: "chromium", viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true } },
    { name: "laptop", testIgnore: /budget.spec/, grep: /@both/, use: { browserName: "chromium", viewport: { width: 1280, height: 800 } } },
    // The speed budget runs last, alone, once the rest are done: timed on a busy machine it measures
    // the machine, not the page.
    { name: "speed-phone", testMatch: /budget.spec/, dependencies: ["phone", "laptop"], use: { browserName: "chromium", viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true } },
    { name: "speed-laptop", testMatch: /budget.spec/, dependencies: ["speed-phone"], use: { browserName: "chromium", viewport: { width: 1280, height: 800 } } },
  ],
  // A production build, not the dev server: pages are ready at once, as they are for users, so
  // the tests check the app rather than the compiler. Port 3100 keeps clear of `pnpm dev`, and
  // BRILLIANDA_PLAYGROUND=1 keeps the /dev playground in this build only.
  webServer: {
    command: "pnpm build && pnpm exec next start -p 3100",
    cwd: "..",
    url: "http://localhost:3100",
    env: { BRILLIANDA_PLAYGROUND: "1" },
    reuseExistingServer: false,
    timeout: 300_000,
  },
});
