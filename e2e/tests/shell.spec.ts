import { open } from "./helpers";
import { expect, test } from "@playwright/test";

// The shared frame, on the dev playground (batch 2). Runs at phone and laptop size.

test("the current tab is marked and the tabs move between pages", { tag: "@both" }, async ({ page }) => {
  await open(page, "/dev");
  const nav = page.getByRole("navigation", { name: "Main" }).locator("visible=true");
  await expect(nav.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  await nav.getByRole("link", { name: "Students" }).click();
  await expect(page).toHaveURL(/\/dev\/students$/);
  await expect(page.getByRole("heading", { name: "Students", level: 1 })).toBeVisible();
});

test("Ctrl+K opens the command palette and goes to a page", { tag: "@both" }, async ({ page, isMobile }) => {
  test.skip(isMobile, "Keyboard shortcut");
  await open(page, "/dev");
  const input = page.getByPlaceholder("Go to a page or find something");
  // The shortcut only works once the page has loaded its scripts, so keep trying until it opens.
  await expect(async () => {
    if (!(await input.isVisible())) await page.keyboard.press("Control+k");
    await expect(input).toBeVisible({ timeout: 1000 });
  }).toPass();
  await input.fill("subj");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/dev\/subjects$/);
});
