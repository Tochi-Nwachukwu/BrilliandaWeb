import { open } from "./helpers";
import { expect, test } from "@playwright/test";

// The four signup screens on fake data (batch 3). Runs at phone and laptop size.

test("a school can sign up from start to finish", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  // The fake keeps every school it creates until the dev server restarts, so use a new name.
  const address = `brightstar-${testInfo.project.name}-${Date.now() % 100000}`;

  await open(page, "/signup");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Tick at least one")).toBeVisible();

  await page.getByLabel("School name").fill("Brightstar College");
  await page.getByText("Secondary", { exact: true }).click();
  await page.getByLabel("State").selectOption("Lagos");
  await page.getByLabel("School phone").fill("0803 000 0001");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page).toHaveURL(/\/signup\/account$/);
  await page.getByLabel("Your full name").fill("Amaka Obi");
  await page.getByLabel("Email").fill("amaka@brightstar.ng");
  await page.getByLabel("Password", { exact: true }).fill("short");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByText("Use at least 8 characters")).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill("brillianda");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page).toHaveURL(/\/signup\/verify$/);
  await expect(page.getByText("amaka@brightstar.ng")).toBeVisible();
  await expect(page.getByText(/The code expires in \d:\d\d/)).toBeVisible();
  await page.getByLabel("6-digit code").fill("000000");
  await page.getByRole("button", { name: "Confirm email" }).click();
  await expect(page.getByText("That code isn’t right", { exact: false })).toBeVisible();
  await page.getByLabel("6-digit code").fill("123456");
  await page.getByRole("button", { name: "Confirm email" }).click();

  await expect(page).toHaveURL(/\/signup\/address$/);
  const field = page.getByLabel("School address");
  await expect(field).toHaveValue("brightstar");

  await field.fill("greenfield");
  await expect(page.getByText("Another school has this address")).toBeVisible();
  await expect(page.getByText("Try one of these")).toBeVisible();

  await field.fill("waec");
  await expect(page.getByText("That name is kept for Brillianda")).toBeVisible();

  await field.fill("2good");
  await expect(page.getByText("Start with a letter")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create my school" })).toBeDisabled();

  await field.fill(address);
  await expect(page.getByText(`${address}.brillianda.com is yours to take`)).toBeVisible();
  await page.getByRole("button", { name: "Create my school" }).click();
  await expect(page).toHaveURL(new RegExp(`/s/${address}$`));
  // The new owner lands signed in on their school.
  await expect(page.getByText("Brightstar College").locator("visible=true").first()).toBeVisible();
});

test("a closed tab picks up where it stopped", async ({ page }) => {
  await open(page, "/signup");
  await page.getByLabel("School name").fill("Riverside Academy");
  await page.getByText("Primary", { exact: true }).click();
  await page.getByLabel("State").selectOption("Oyo");
  await page.getByLabel("School phone").fill("08030000002");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/signup\/account$/);

  await open(page, "/signup");
  await expect(page.getByLabel("School name")).toHaveValue("Riverside Academy");
  await page.getByRole("link", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/signup\/account$/);
});

test("later steps send you back to the start without a draft", async ({ page }) => {
  await page.goto("/signup/address");
  await expect(page).toHaveURL(/\/signup$/);
});
