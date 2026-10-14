import { expect, test, type Page } from "@playwright/test";
import { open } from "./helpers";

// The Brillianda team console (batch 13). Team accounts are separate from school accounts.

async function teamSignIn(page: Page, email = "team@brillianda.com") {
  await open(page, "/console/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("brillianda");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test("the team sees every school, and opening one is shown to that school", { tag: "@both" }, async ({ page, browser }) => {
  test.setTimeout(90_000);
  await teamSignIn(page);
  await expect(page).toHaveURL(/\/console$/);
  await expect(page.getByText("Active schools")).toBeVisible();

  await open(page, "/console/schools");
  await page.getByLabel("Search schools").fill("greenfield");
  await page.getByRole("link", { name: /Greenfield College/ }).click();
  await expect(page.getByRole("heading", { name: "Greenfield College" }).locator("visible=true")).toBeVisible();
  await expect(page.getByText("Amaka Obi").locator("visible=true").first()).toBeVisible();
  await expect(page.getByText(/This visit is recorded/)).toBeVisible();

  // The school sees the visit in its own history.
  const owner = await (await browser.newContext()).newPage();
  await open(owner, "/s/greenfield/login");
  await owner.getByLabel("Email").fill("owner@greenfield.ng");
  await owner.getByLabel("Password", { exact: true }).fill("brillianda");
  await owner.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(owner).toHaveURL(/\/s\/greenfield$/);
  await open(owner, "/s/greenfield/more/history?q=console");
  await expect(owner.getByText(/viewed the school’s summary from the Brillianda team console/i).first()).toBeVisible();
});

test("a school's account can't sign in to the console", async ({ page }) => {
  await teamSignIn(page, "owner@greenfield.ng");
  await expect(page.getByText("That email and password don’t match a team account.")).toBeVisible();
  await page.goto("/console/schools");
  await expect(page).toHaveURL(/\/console\/login$/);
});

test("pausing a school needs a reason, stops sign-in, and can be undone", async ({ page }) => {
  test.setTimeout(90_000);
  await teamSignIn(page);
  await expect(page).toHaveURL(/\/console$/);
  await open(page, "/console/schools/lakeside");
  await page.getByRole("button", { name: "Pause the school" }).click();
  await expect(page.getByText("Give a reason")).toBeVisible();
  await page.getByLabel("Why pause it?").fill("Asked to pause over the holiday.");
  await page.getByRole("button", { name: "Pause the school" }).click();
  await expect(page.getByText("Lakeside Grammar School is paused").locator("visible=true")).toBeVisible();

  const visitor = await (await page.context().browser()!.newContext()).newPage();
  await visitor.goto("/s/lakeside/login");
  await expect(visitor.getByRole("heading", { name: "This school’s account is paused" })).toBeVisible();

  await page.getByLabel("Why reactivate it?").fill("Back for the new term.");
  await page.getByRole("button", { name: "Reactivate the school" }).click();
  await expect(page.getByText("Lakeside Grammar School is active again").locator("visible=true")).toBeVisible();
  await visitor.goto("/s/lakeside/login");
  await expect(visitor.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
});

test("a trial request is followed up", async ({ page }) => {
  await teamSignIn(page);
  await expect(page).toHaveURL(/\/console$/);
  await open(page, "/console/trials");
  const card = page.getByRole("listitem").filter({ hasText: "Bright Future Academy" });
  await card.getByRole("button", { name: "Update" }).click();
  await page.getByLabel("Status").last().selectOption("contacted");
  await page.getByLabel("Note for the team").fill("Called; demo on Friday.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(card.getByText("Contacted")).toBeVisible();
  await expect(card.getByText("Team note: Called; demo on Friday.")).toBeVisible();
});
