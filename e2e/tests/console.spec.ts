import { expect, test, type Page } from "@playwright/test";
import { open, TOURS_SEEN } from "./helpers";

// The Brillianda team console (batch 13). Team accounts are separate from school accounts.

async function teamSignIn(page: Page, email = "team@brillianda.com") {
  await open(page, "/console/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("brillianda");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test("only the team signs in; pausing a school and following up a trial request", async ({ page }) => {
  test.setTimeout(120_000);
  // A school's account gets nowhere here.
  await teamSignIn(page, "owner@greenfield.ng");
  await expect(page.getByText("That email and password don’t match a team account.")).toBeVisible();
  await page.goto("/console/schools");
  await expect(page).toHaveURL(/\/console\/login$/);

  // Pausing needs a reason, stops sign-in, and can be undone.
  await teamSignIn(page);
  await expect(page).toHaveURL(/\/console$/);
  await open(page, "/console/schools/lakeside");
  await page.getByRole("button", { name: "Pause the school" }).click();
  await expect(page.getByText("Give a reason")).toBeVisible();
  await page.getByLabel("Why pause it?").fill("Asked to pause over the holiday.");
  await page.getByRole("button", { name: "Pause the school" }).click();
  await expect(page.getByText("Lakeside Grammar School is paused").locator("visible=true")).toBeVisible();
  const visitor = await (await page.context().browser()!.newContext({ storageState: TOURS_SEEN })).newPage();
  await visitor.goto("/s/lakeside/login");
  await expect(visitor.getByRole("heading", { name: "This school’s account is paused" })).toBeVisible();
  await page.getByLabel("Why reactivate it?").fill("Back for the new term.");
  await page.getByRole("button", { name: "Reactivate the school" }).click();
  await expect(page.getByText("Lakeside Grammar School is active again").locator("visible=true")).toBeVisible();
  await visitor.goto("/s/lakeside/login");
  await expect(visitor.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();

  // A trial request is followed up.
  await open(page, "/console/trials");
  const card = page.getByRole("listitem").filter({ hasText: "Bright Future Academy" });
  await card.getByRole("button", { name: "Update" }).click();
  await page.getByLabel("Status").last().selectOption("contacted");
  await page.getByLabel("Note for the team").fill("Called; demo on Friday.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(card.getByText("Contacted")).toBeVisible();
  await expect(card.getByText("Team note: Called; demo on Friday.")).toBeVisible();
});
