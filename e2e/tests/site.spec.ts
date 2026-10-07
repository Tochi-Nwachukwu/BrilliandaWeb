import { expect, test } from "@playwright/test";

// The marketing site, moved from the old Vite site (batch 3). Runs at phone and laptop size.

test.beforeEach(async ({ page }) => {
  // Skip the first-visit intro so the page is usable straight away.
  await page.addInitScript(() => localStorage.setItem("brillianda-seen", "1"));
});

test("the home page loads with the new name", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Brillianda/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("The term’s results");
  await expect(page.locator("#signin")).toHaveAttribute("href", "/login");
});

test("the live mark sheet works out a total and grade", async ({ page }) => {
  await page.goto("/");
  const exam = page.getByLabel("EXAM for Samuel Obi, maximum 60");
  await exam.scrollIntoViewIfNeeded();
  await exam.fill("50");
  const row = page.locator('[data-row="s6"]');
  await expect(row).toContainText("80");
  await expect(row).toContainText("A");
});

test("a trial request can be sent", async ({ page }) => {
  await page.goto("/");
  const form = page.locator("#trial-form");
  await form.scrollIntoViewIfNeeded();
  // The form only reacts once the page's scripts have started.
  await expect(page.locator("[data-grid-body] tr").first()).toBeAttached();
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
