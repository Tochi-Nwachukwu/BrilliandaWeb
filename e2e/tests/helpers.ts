import type { Page } from "@playwright/test";

/**
 * Every guide pop-up already seen: they start by themselves on a first visit and would sit over the
 * page. The config gives every test this; a second window opened in a test needs it too.
 */
export const TOURS_SEEN = {
  cookies: [],
  origins: ["http://localhost:3100", "http://greenfield.localhost:3100"].map((origin) => ({
    origin,
    localStorage: ["admin", "teacher", "parent", "student", "console"].map((id) => ({ name: `brillianda:tour:${id}`, value: "seen" })),
  })),
};

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
