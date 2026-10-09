import { expect, test } from "@playwright/test";

// The marketing site (batch 3; copy rewritten for v1). Runs at phone and laptop size.

test.beforeEach(async ({ page }) => {
  // Skip the first-visit intro so the page is usable straight away.
  await page.addInitScript(() => localStorage.setItem("brillianda-seen", "1"));
});

test("the home page describes v1 and leads to signup", { tag: "@both" }, async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Brillianda — Classes, subjects and students/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Your whole school");
  await expect(page.locator("#signin")).toHaveAttribute("href", "/login");
  await expect(page.getByRole("link", { name: "Create your school" }).first()).toHaveAttribute("href", "/signup");
  await expect(page.getByRole("heading", { name: "Six things, done properly." })).toBeAttached();
  await expect(page.getByText("Import your list").first()).toBeAttached();
});

test("a trial request can be sent", async ({ page }) => {
  await page.goto("/");
  const form = page.locator("#trial-form");
  await form.scrollIntoViewIfNeeded();
  // The form only reacts once the page's scripts have started.
  await expect(page.locator("body")).not.toHaveClass(/is-loading/);
  await form.getByRole("button", { name: "Send the request" }).click();
  await expect(form.locator("[data-form-message]")).toHaveText("Please check the highlighted fields.");

  await page.getByLabel("School name").fill("Royal Heights College");
  await page.getByLabel("Your name").fill("Amara Bello");
  await page.getByLabel("Your role").selectOption("PROPRIETOR");
  await page.getByLabel("Email").fill("amara@royalheights.ng");
  await page.getByLabel("Phone").fill("08012345678");
  await page.getByLabel("About how many students?").fill("420");
  await form.getByRole("button", { name: "Send the request" }).click();
  await expect(page.getByRole("heading", { name: "Thank you — it’s with us." })).toBeVisible();
});
