import type { Page } from "@playwright/test";

/**
 * Go to a page and wait until it is interactive (the app sets <html data-hydrated>). A load the
 * page itself interrupts (a sign-in still redirecting, say) is tried once more.
 */
export async function open(page: Page, url: string) {
  try {
    await page.goto(url);
  } catch (error) {
    if (!String(error).includes("ERR_ABORTED")) throw error;
    await page.goto(url);
  }
  await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
}
