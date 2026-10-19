import { expect, test } from "@playwright/test";
import { open } from "./helpers";

// My profile (every dashboard), as Greenfield's English teacher. Their password is put back at the
// end: the laptop run of the results test signs in with it.

test("a teacher changes their name and password from My profile", async ({ page }) => {
  await open(page, "/s/greenfield/login");
  await page.getByLabel("Email").fill("english@greenfield.ng");
  await page.getByLabel("Password", { exact: true }).fill("brillianda");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/teach$/);

  await page.getByRole("button", { name: "Your account" }).locator("visible=true").click();
  await page.getByRole("link", { name: "My profile" }).click();
  await expect(page.getByRole("heading", { name: "My profile" })).toBeVisible();
  await expect(page.getByLabel("Email address")).toHaveAttribute("readonly");

  await page.getByLabel("Last name").fill("Okafor-Eze");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Profile saved").locator("visible=true")).toBeVisible();
  await page.getByRole("button", { name: "Your account" }).locator("visible=true").click();
  await expect(page.getByText(/Okafor-Eze/).locator("visible=true").first()).toBeVisible();
  await page.keyboard.press("Escape");

  const change = async (current: string, next: string) => {
    await page.getByLabel("Current password").fill(current);
    await page.getByLabel("New password").fill(next);
    await page.getByLabel("Type it again").fill(next);
    await page.getByRole("button", { name: "Change password" }).click();
  };
  await change("wrong-password", "a-new-password");
  await expect(page.getByText("That isn’t your current password")).toBeVisible();
  await change("brillianda", "a-new-password");
  await expect(page.getByText("Password changed").locator("visible=true")).toBeVisible();
  await change("a-new-password", "brillianda");
  await expect(page.getByText("Password changed").locator("visible=true").first()).toBeVisible();
});
