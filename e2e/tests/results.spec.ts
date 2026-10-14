import { expect, test, type Page } from "@playwright/test";
import { open } from "./helpers";

// Results, batch 14: score sheets on Greenfield. Each screen size fills a different sheet for
// JSS 1 Gold (Mathematics by Bisi on phone, English Studies by Kemi on laptop), so the runs never
// touch the same scores.

async function signIn(page: Page, email: string) {
  await open(page, "/s/greenfield/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("brillianda");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test("a teacher fills a sheet, marks it complete, and an admin unlocks it", { tag: "@both" }, async ({ page, browser }, testInfo) => {
  test.setTimeout(150_000);
  const [email, subject] = testInfo.project.name === "phone" ? ["teacher@greenfield.ng", "Mathematics"] : ["english@greenfield.ng", "English Studies"];
  await signIn(page, email);
  await expect(page).toHaveURL(/\/teach$/);
  await open(page, "/s/greenfield/teach/subjects");
  await page.getByRole("link").filter({ hasText: "JSS 1 Gold" }).filter({ hasText: subject }).click();
  await expect(page.getByRole("heading", { name: `${subject}, JSS 1 Gold` })).toBeVisible();

  // Too high a score is caught in the box; the grid explains, and the save waits.
  const first = page.locator('input[id^="cell-"]').first();
  await first.fill("25");
  await first.press("Tab");
  await expect(page.getByText("Must be 20 or less").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark complete" })).toBeDisabled();

  // Fill every box: ABS for the first, 15 for the rest. Totals and grades appear as it fills.
  await first.fill("ABS");
  await first.press("Tab");
  for (const cell of await page.locator('input[id^="cell-"]').all()) {
    if ((await cell.inputValue()) === "") {
      await cell.fill("15");
      await cell.press("Tab");
    }
  }
  await expect(page.getByText(/(\d+) of \1 students complete/)).toBeVisible();
  await page.getByRole("button", { name: "Mark complete" }).click();
  await expect(page.getByText("Marked complete").locator("visible=true")).toBeVisible();
  await expect(page.getByText("This sheet is marked complete.", { exact: false })).toBeVisible();
  await expect(first).toBeDisabled();

  // The teacher asks to unlock; an admin sees the request and unlocks.
  await page.getByRole("button", { name: "Ask to unlock" }).click();
  await page.getByLabel("What needs changing?").fill("One CA score was typed wrongly.");
  await page.getByRole("button", { name: "Send the request" }).click();
  await expect(page.getByText(/You asked to unlock it/)).toBeVisible();

  const admin = await (await browser.newContext()).newPage();
  await signIn(admin, "owner@greenfield.ng");
  await expect(admin).toHaveURL(/\/s\/greenfield$/);
  await open(admin, "/s/greenfield/results");
  await admin.getByRole("link").filter({ hasText: `${subject}, JSS 1 Gold` }).click();
  await expect(admin.getByText("One CA score was typed wrongly.", { exact: false })).toBeVisible();
  await admin.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(admin.getByText("Unlocked").locator("visible=true")).toBeVisible();

  await page.reload();
  await expect(page.locator('input[id^="cell-"]').first()).toBeEnabled();
});

test("an admin changes the grading scale; parts stay fixed once scores are in", async ({ page }) => {
  await signIn(page, "owner@greenfield.ng");
  await expect(page).toHaveURL(/\/s\/greenfield$/);
  await open(page, "/s/greenfield/more/results");
  await expect(page.getByText("Scores are already in for this term", { exact: false })).toBeVisible();
  await expect(page.getByLabel("Marks").first()).toBeDisabled();
  await page.getByRole("button", { name: "Use WAEC style (A1 to F9)" }).click();
  await expect(page.getByLabel("Grade").first()).toHaveValue("A1");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Results settings saved").locator("visible=true")).toBeVisible();
  // Back to A to F for the other tests.
  await page.getByRole("button", { name: "Use A to F" }).click();
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Results settings saved").locator("visible=true").first()).toBeVisible();
});
