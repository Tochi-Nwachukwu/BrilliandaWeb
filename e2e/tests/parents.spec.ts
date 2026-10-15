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

test("a parent sees their own child, and nothing else", { tag: "@both" }, async ({ page }) => {
  await signIn(page, "parent@greenfield.ng");
  await expect(page).toHaveURL(/\/s\/greenfield\/family$/);
  // Another test may give this guardian a second child, so open the JSS 1 Blue one directly.
  await open(page, "/s/greenfield/family/st1");
  await expect(page.getByText("JSS 1 Blue").first()).toBeVisible();
  await expect(page.getByText("Bisi Adebayo").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Attendance" }).first()).toBeVisible();
  // JSS 1 Blue isn't published yet, so no results show.
  await expect(page.getByText("Results for this term aren’t out yet.", { exact: false })).toBeVisible();

  // Admin and teacher screens send a parent back to their own.
  await page.goto("/s/greenfield/students");
  await expect(page).toHaveURL(/\/family$/);
  await page.goto("/s/greenfield/teach");
  await expect(page).toHaveURL(/\/family$/);

  // Another family's child isn't there, whatever the address says.
  await open(page, "/s/greenfield/family/st70");
  await expect(page.getByText("This page isn’t here")).toBeVisible();

  // The sign-in page says who is signed in, and lets them switch accounts.
  await open(page, "/s/greenfield/login");
  await expect(page.getByRole("heading", { name: "You’re already signed in" })).toBeVisible();
  await page.getByRole("button", { name: "Sign out and use another account" }).click();
  await expect(page.getByLabel("Email")).toBeVisible();
});

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
