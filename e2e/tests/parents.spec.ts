import { expect, test, type Page } from "@playwright/test";
import { open, TOURS_SEEN } from "./helpers";

// Parents (batch 12), on Greenfield. The sample parent (parent@greenfield.ng) is the guardian of the
// first JSS 1 Blue student, whose class has sample registers.

async function signIn(page: Page, email: string, password = "brillianda") {
  await open(page, "/s/greenfield/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test("an admin invites a parent, who signs up and sees their child", async ({ page, browser }) => {
  test.setTimeout(90_000);
  await signIn(page, "owner@greenfield.ng");
  await expect(page).toHaveURL(/\/s\/greenfield$/);
  await open(page, "/s/greenfield/more/parents");

  // The first guardian who can be invited (has an email, not on the app yet).
  const row = page.getByRole("listitem").filter({ has: page.getByRole("button", { name: "Invite", exact: true }) }).first();
  const child = (await row.getByRole("link").first().textContent())!.trim();
  await row.getByRole("button", { name: "Invite", exact: true }).click();
  await expect(page.getByText(/Invite sent to/).locator("visible=true")).toBeVisible();
  const href = await page.getByRole("link", { name: /^Open .+’s invite$/ }).first().getAttribute("href");

  const parent = await (await browser.newContext({ storageState: TOURS_SEEN })).newPage();
  await open(parent, href!);
  await expect(parent.getByText("you’ve been invited to follow your children at this school.")).toBeVisible();
  await parent.getByLabel("New password", { exact: true }).fill("a-parents-password");
  await parent.getByLabel("Type it again", { exact: true }).fill("a-parents-password");
  await parent.getByRole("button", { name: "Join the school" }).click();
  await expect(parent).toHaveURL(/\/family$/);
  await expect(parent.getByText(child).first()).toBeVisible();
});
