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

test("the look is remembered after a reload", async ({ page }) => {
  await open(page, "/dev");
  const neutral = page.getByRole("button", { name: "Neutral" });
  await expect(async () => {
    if (!(await neutral.isVisible())) await page.getByRole("button", { name: "Your account" }).click();
    await expect(neutral).toBeVisible({ timeout: 1000 });
  }).toPass();
  await neutral.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "neutral");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "neutral");
});

test("selecting students shows the action bar", { tag: "@both" }, async ({ page, isMobile }) => {
  await open(page, "/dev/students");
  if (isMobile) {
    await page.getByRole("button", { name: "Select", exact: true }).click();
    await page.getByRole("list", { name: "Students" }).getByRole("button").first().click();
  } else {
    await page.getByRole("checkbox", { name: "Select", exact: true }).first().check();
  }
  await expect(page.getByRole("region", { name: "Selected" })).toContainText("1 student selected");
});
