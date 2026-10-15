import { expect, test, type Page } from "@playwright/test";
import { open } from "./helpers";

// Books and things needed (batch 20), on Greenfield. Its sample lists: JSS 1 for this session and
// JSS 2 for the next, both shared; the sample parent's child is in JSS 1 Blue.

async function signIn(page: Page, email: string) {
  await open(page, "/s/greenfield/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("brillianda");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test("a parent sees the lists for this class and the next one", { tag: "@both" }, async ({ page }) => {
  await signIn(page, "parent@greenfield.ng");
  await expect(page).toHaveURL(/\/family$/);
  await open(page, "/s/greenfield/family/st1");
  await expect(page.getByText(/For next session: JSS 2, \d{4}\/\d{4}/)).toBeVisible();
  await expect(page.getByText("New General Mathematics for JSS 2")).toBeVisible();
  await expect(page.getByText(/This session: JSS 1/)).toBeVisible();
  await expect(page.getByText("Total (2 items have no price)")).toBeVisible();
});

test("the school writes a class's list and shares it", async ({ page }) => {
  await signIn(page, "admin@greenfield.ng");
  await expect(page).toHaveURL(/\/s\/greenfield$/);
  await open(page, "/s/greenfield/more/book-lists");
  await expect(page.getByRole("link", { name: /Next session/ })).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "SS 2", exact: true }).click();
  await expect(page.getByText("Nothing on this list yet.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Share with parents" })).toBeDisabled();

  await page.getByRole("button", { name: "Add an item" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Item").fill("Further Mathematics for SS 2");
  await dialog.getByLabel("How many").fill("1");
  await dialog.getByLabel("Price for one, ₦ (optional)").fill("lots");
  await dialog.getByRole("button", { name: "Add to the list" }).click();
  await expect(dialog.getByText("Please check the highlighted fields.")).toBeVisible();
  await dialog.getByLabel("Price for one, ₦ (optional)").fill("5,200");
  await dialog.getByRole("button", { name: "Add to the list" }).click();
  await expect(page.getByText("₦5,200").first()).toBeVisible();

  await page.getByRole("button", { name: "Share with parents" }).click();
  await expect(page.getByText("Shared with parents", { exact: true })).toBeVisible();
});
