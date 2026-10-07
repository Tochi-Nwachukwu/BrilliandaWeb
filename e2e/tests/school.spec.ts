import { open } from "./helpers";
import { expect, test, type Page } from "@playwright/test";

// Each school's look and signing in (batch 4), on fake data. Runs at phone and laptop size.
// Sample password for every fake account: brillianda.

const primary = (page: Page) => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim());

async function signIn(page: Page, school: string, email: string, password = "brillianda") {
  await open(page, `/s/${school}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/s/${school}$`));
}

test("two schools wear their own name and colour", async ({ page }) => {
  await page.goto("/s/greenfield/login");
  await expect(page.getByText("Greenfield College").locator("visible=true").first()).toBeVisible();
  expect(await primary(page)).toBe("#4A3AA7");

  await page.goto("/s/surebloom/login");
  await expect(page.getByText("Surebloom School").locator("visible=true").first()).toBeVisible();
  expect(await primary(page)).toBe("#1E6B45");
});

test("an unknown address and a paused school say so", async ({ page }) => {
  await page.goto("/s/nosuchschool/login");
  await expect(page.getByRole("heading", { name: "There’s no school at this address" })).toBeVisible();
  await page.goto("/s/closedschool/login");
  await expect(page.getByRole("heading", { name: "This school’s account is paused" })).toBeVisible();
});

test("signing in, out, and the wrong password", async ({ page }) => {
  await page.goto("/s/greenfield");
  await expect(page).toHaveURL(/\/s\/greenfield\/login$/);

  await open(page, "/s/greenfield/login");
  await page.getByLabel("Email").fill("owner@greenfield.ng");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("That email and password don’t match.")).toBeVisible();

  // Someone from another school gets the same answer, not a hint that the email exists.
  await page.getByLabel("Email").fill("owner@surebloom.ng");
  await page.getByLabel("Password", { exact: true }).fill("brillianda");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByText("That email and password don’t match.")).toBeVisible();

  await signIn(page, "greenfield", "owner@greenfield.ng");
  await expect(page.getByRole("heading", { name: "Home" })).toBeVisible();
  await page.getByRole("button", { name: "Your account" }).click();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/s\/greenfield\/login$/);
});

test("a forgotten password can be reset from the emailed link", async ({ page }) => {
  await open(page, "/s/surebloom/forgot-password");
  await page.getByLabel("Email").fill("owner@surebloom.ng");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("If that email is on file, a reset link is on its way.")).toBeVisible();
  await page.getByRole("link", { name: "Open the reset link" }).click();

  await page.getByLabel("New password", { exact: true }).fill("a-new-password");
  await page.getByLabel("Type it again", { exact: true }).fill("a-new-password");
  await page.getByRole("button", { name: "Change password" }).click();
  await page.getByRole("button", { name: "Sign in" }).click();
  await signIn(page, "surebloom", "owner@surebloom.ng", "a-new-password");
});

test("an unknown email gets the same answer and no link", async ({ page }) => {
  await open(page, "/s/greenfield/forgot-password");
  await page.getByLabel("Email").fill("nobody@nowhere.ng");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText("If that email is on file, a reset link is on its way.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Open the reset link" })).toHaveCount(0);
});

test("an emailed sign-in link signs you in once", async ({ page }) => {
  await open(page, "/s/greenfield/magic-link");
  await page.getByLabel("Email").fill("admin@greenfield.ng");
  await page.getByRole("button", { name: "Email me a link" }).click();
  await page.getByRole("link", { name: "Open the sign-in link" }).click();
  await expect(page).toHaveURL(/\/magic\//);
  const link = page.url();
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/s\/greenfield$/);

  await open(page, link);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("This link has expired or has been used.")).toBeVisible();
});

test("the owner invites an admin, who joins", async ({ page, browser }, testInfo) => {
  test.setTimeout(60_000);
  const email = `ruth-${testInfo.project.name}-${Date.now() % 100000}@greenfield.ng`;
  await signIn(page, "greenfield", "owner@greenfield.ng");
  await open(page, "/s/greenfield/more/admins");
  await page.getByRole("button", { name: "Invite an admin" }).click();
  await page.getByLabel("Full name").fill("Ruth Ekanem");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send invite" }).click();
  await expect(page.getByText(email, { exact: true }).locator("visible=true")).toBeVisible();
  const href = await page.getByRole("link", { name: "Open the invite link" }).getAttribute("href");

  const ruth = await (await browser.newContext()).newPage();
  await open(ruth, href!);
  await expect(ruth.getByRole("heading", { name: "Join Greenfield College" })).toBeVisible();
  await ruth.getByLabel("New password", { exact: true }).fill("ruths-password");
  await ruth.getByLabel("Type it again", { exact: true }).fill("ruths-password");
  await ruth.getByRole("button", { name: "Join the school" }).click();
  await expect(ruth).toHaveURL(/\/s\/greenfield$/);

  // An admin sees the team but can't invite or remove.
  await ruth.goto("/s/greenfield/more/admins");
  await expect(ruth.getByText("Ruth Ekanem (you)")).toBeVisible();
  await expect(ruth.getByRole("button", { name: "Invite an admin" })).toHaveCount(0);
  await expect(ruth.getByRole("button", { name: "Remove" })).toHaveCount(0);
});

test("someone in two schools gets a picker on /login", async ({ page }) => {
  await signIn(page, "greenfield", "admin@greenfield.ng");
  await page.goto("/login");
  await expect(page.getByRole("link", { name: /Greenfield College/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Surebloom School/ })).toBeVisible();
});

test("Find my school answers the same for any email", async ({ page }) => {
  await open(page, "/login");
  await page.getByLabel("Email").fill("nobody@nowhere.ng");
  await page.getByRole("button", { name: "Email me my schools" }).click();
  await expect(page.getByText("If that email is on file, we’ve sent a link to each of your schools.")).toBeVisible();
});
