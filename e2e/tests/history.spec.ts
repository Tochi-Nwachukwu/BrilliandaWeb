import { expect, test, type Page } from "@playwright/test";
import { open } from "./helpers";

// More › Change history (plan: "Audit log of changes"), on Greenfield's seeded changes. Read-only,
// so both screen sizes can share the school.

async function signIn(page: Page) {
  await open(page, "/s/greenfield/login");
  await page.getByLabel("Email").fill("owner@greenfield.ng");
  await page.getByLabel("Password", { exact: true }).fill("brillianda");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/s\/greenfield$/);
}

test("the whole history, narrowed by person, words and dates", async ({ page }) => {
  await signIn(page);

  // Home's card leads here.
  await page.getByRole("link", { name: "See all", exact: true }).click();
  await expect(page).toHaveURL(/\/more\/history$/);
  await expect(page.getByText("Created the school").locator("visible=true")).toBeVisible();
  await expect(page.getByText("Joined as an admin").locator("visible=true").first()).toBeVisible();

  // One person.
  await page.getByLabel("Who").selectOption("Tunde Bello");
  await expect(page).toHaveURL(/who=Tunde/);
  await expect(page.getByText("Joined as an admin").locator("visible=true").first()).toBeVisible();
  await expect(page.getByText("Created the school").locator("visible=true")).toHaveCount(0);

  // Words, across everyone.
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByLabel("Search the history").fill("calendar");
  await expect(page).toHaveURL(/q=calendar/);
  await expect(page.getByText("Set the 2026/2027 calendar").locator("visible=true")).toBeVisible();
  await expect(page.getByText("Joined as an admin").locator("visible=true")).toHaveCount(0);

  // Dates: nothing happened in 2020.
  await open(page, "/s/greenfield/more/history?from=2020-01-01&to=2020-12-31");
  await expect(page.getByText("Nothing matches")).toBeVisible();
});
