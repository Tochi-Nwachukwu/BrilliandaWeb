import { expect, test, type Page } from "@playwright/test";
import { open } from "./helpers";

// The guide pop-ups and the Help panel. Every other test starts with the tours already seen
// (playwright.config.ts); these start fresh, as a first visit does.
test.use({ storageState: { cookies: [], origins: [] } });

async function signIn(page: Page, email: string) {
  await open(page, "/s/greenfield/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("brillianda");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test("the tour shows once, can be skipped, and comes back from Help", async ({ page }) => {
  await signIn(page, "admin@greenfield.ng");
  await expect(page).toHaveURL(/\/s\/greenfield$/);

  const tour = page.getByRole("dialog", { name: "Welcome to your school on Brillianda" });
  await expect(tour).toBeVisible();
  await tour.getByRole("button", { name: "Show me" }).click();
  const step = page.getByRole("dialog", { name: "Home" });
  await expect(step).toContainText("2 of");
  await step.getByRole("button", { name: "Skip tour" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Seen on this device: not again after a reload.
  await page.reload();
  await page.locator("html[data-hydrated]").waitFor({ state: "attached" });
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // Help: this page's questions first, a search, and the tour again.
  await page.getByRole("button", { name: "Help" }).click();
  const help = page.getByRole("dialog", { name: "Help" });
  await expect(help.getByRole("heading", { name: "On this page" })).toBeVisible();
  await help.getByLabel("Search help").fill("import");
  await help.getByText("How do I add my whole list at once?").click();
  await expect(help.getByText(/Download the template/)).toBeVisible();
  await help.getByRole("button", { name: "Take the tour again" }).click();
  await expect(page.getByRole("dialog", { name: "Welcome to your school on Brillianda" })).toBeVisible();
});
