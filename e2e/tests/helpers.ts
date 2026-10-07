import type { Page } from "@playwright/test";

/** Go to a page and wait until it is interactive (the app sets <html data-hydrated>). */
export async function open(page: Page, url: string) {
  await page.goto(url);
  await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
}
