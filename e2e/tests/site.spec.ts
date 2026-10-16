import { expect, test } from "@playwright/test";

// The marketing site (batch 3; copy rewritten for v1). Runs at phone and laptop size.

test.beforeEach(async ({ page }) => {
  // Skip the first-visit intro so the page is usable straight away.
  await page.addInitScript(() => localStorage.setItem("brillianda-seen", "1"));
});

test("the home page describes v1 and leads to signup", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Brillianda — Classes, subjects and students/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Your whole school");
  await expect(page.locator("#signin")).toHaveAttribute("href", "/login");
  await expect(page.getByRole("link", { name: "Create your school" }).first()).toHaveAttribute("href", "/signup");
  await expect(page.getByRole("heading", { name: "Six things, done properly." })).toBeAttached();
  await expect(page.getByText("Import your list").first()).toBeAttached();
});
