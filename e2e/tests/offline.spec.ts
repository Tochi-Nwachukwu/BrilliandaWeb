import { expect, test } from "@playwright/test";
import { open } from "./helpers";

// Opening the app with no connection (plan: "v1 caches the app shell and shows a clear offline
// banner"). After one visit, a page that can't load shows our offline page, not the browser's.

test("with no connection, a page shows the saved offline page", async ({ page, context }) => {
  await open(page, "/s/greenfield/login");
  // The service worker installs and saves the offline page in the background.
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(async () => Boolean(await caches.match("/offline")))).toBe(true);

  await context.setOffline(true);
  await page.goto("/s/greenfield/students").catch(() => undefined);
  await expect(page.getByRole("heading", { name: "You’re offline" })).toBeVisible();
  await expect(page.getByText("your school’s records stay on Brillianda", { exact: false })).toBeVisible();
  // Styled from the saved files, not bare HTML: the button wears the app's look.
  await expect(page.getByRole("button", { name: "Try again" })).toHaveCSS("border-radius", /px/);

  // No page with school data was saved on the phone.
  const saved = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) for (const request of await (await caches.open(name)).keys()) urls.push(new URL(request.url).pathname);
    return urls;
  });
  expect(saved.filter((path) => !path.startsWith("/_next/static/"))).toEqual(["/offline"]);

  // Back online, it reloads by itself into the real page.
  await context.setOffline(false);
  await expect(page.getByRole("heading", { name: "You’re offline" })).toHaveCount(0);
});
