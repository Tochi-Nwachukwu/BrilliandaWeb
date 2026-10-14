import { expect, test, type Page } from "@playwright/test";
import { open } from "./helpers";

// Running the school year (group 3), on Harbourview, a school kept for these tests: closing a term
// changes the whole school, so nothing else uses it. Phone only: one run changes it once.

async function signIn(page: Page) {
  await open(page, "/s/harbourview/login");
  await page.getByLabel("Email").fill("owner@harbourview.ng");
  await page.getByLabel("Password", { exact: true }).fill("brillianda");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/s\/harbourview$/);
}

test("closing the first term opens the next one's sheets on its start date", async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page);
  await open(page, "/s/harbourview/more/sessions");
  await expect(page.getByText("First Term, 2026/2027, is open for scores.")).toBeVisible();

  await page.getByRole("button", { name: "Close First Term" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel("Second Term starts")).not.toHaveValue("");
  await dialog.getByRole("button", { name: "Close First Term" }).click();
  await expect(page.getByText(/First Term closed; Second Term is next/).locator("visible=true")).toBeVisible();
  await expect(page.getByText("Closed", { exact: true })).toBeVisible();
  await expect(page.getByText(/Second Term opens for scores on/)).toBeVisible();

  // Results wait for the next term.
  await open(page, "/s/harbourview/results");
  await expect(page.getByText(/No term is open for scores\. Second Term opens on/)).toBeVisible();
});

// Seaview is in the last term of 2025/2026 (its first two terms are closed), so promotion is open.
test("promotion: suggested from the yearly average, changed by hand, then completed", async ({ page }) => {
  test.setTimeout(90_000);
  await open(page, "/s/seaview/login");
  await page.getByLabel("Email").fill("owner@seaview.ng");
  await page.getByLabel("Password", { exact: true }).fill("brillianda");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/s\/seaview$/);

  await open(page, "/s/seaview/more/promotion");
  await expect(page.getByText("From 2025/2026 to 2026/2027.", { exact: false })).toBeVisible();
  const decision = page.getByRole("combobox", { name: /^Decision for / }).first();
  await expect(decision).toHaveValue("promote");

  // Changed by hand, with a reason; then back to the suggestion.
  await decision.selectOption("repeat");
  await expect(page.getByLabel(/^Why, for /).first()).toBeVisible();
  await decision.selectOption("promote");
  await expect(page.getByLabel(/^Why, for /)).toHaveCount(0);

  await page.getByRole("button", { name: "Complete promotion" }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("1 move up, 0 repeat, 0 graduate.", { exact: false })).toBeVisible();
  await dialog.getByRole("button", { name: "Complete promotion" }).click();
  await expect(page.getByText(/2026\/2027 has begun: 1 moved up/).locator("visible=true")).toBeVisible();

  // The new session, and the student a class up.
  await open(page, "/s/seaview/more/sessions");
  await expect(page.getByText("2026/2027 session")).toBeVisible();
  await open(page, "/s/seaview/students");
  await expect(page.getByText(/JSS ?2/).locator("visible=true").first()).toBeVisible();
});
