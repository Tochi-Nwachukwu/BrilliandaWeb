import { expect, test, type Page } from "@playwright/test";
import { open } from "./helpers";

// Birthday messages (batch 19), on Greenfield, which sends them. The sample data gives Chiamaka
// Grace Okafor (st1, the sample parent's child) a birthday today, and two more this week.

async function signIn(page: Page, email: string) {
  await open(page, "/s/greenfield/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("brillianda");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test("the school sees the week's birthdays, the texts sent, and its message", async ({ page }) => {
  await signIn(page, "admin@greenfield.ng");
  await expect(page).toHaveURL(/\/s\/greenfield$/);
  const week = page.getByRole("list", { name: "Birthdays this week" });
  await expect(week.getByText("Chiamaka Grace Okafor")).toBeVisible();
  await expect(week.getByText("Today").first()).toBeVisible();

  await open(page, "/s/greenfield/more/birthdays");
  await expect(page.getByRole("list", { name: "Coming birthdays" }).getByText("Chiamaka Grace Okafor")).toBeVisible();
  // Today's text went to her guardian.
  await expect(page.getByRole("list", { name: "Messages sent" }).getByText(/To \+234\d+: Happy \d+\w\w birthday, Chiamaka!/)).toBeVisible();

  // The message must name the child; the preview follows the words.
  const message = page.getByLabel("Message", { exact: true });
  await message.fill("Happy birthday from all of us!");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Include {name}", { exact: false })).toBeVisible();
  await message.fill("Happy birthday, ");
  await page.getByRole("button", { name: "Add {name}" }).click();
  await expect(page.getByText("Happy birthday, Chiamaka", { exact: true })).toBeVisible();
});
