import { expect, test, type Page } from "@playwright/test";
import { open } from "./helpers";

// Students (batch 8), on Greenfield's sample students. Each screen size adds its own student, so
// the two runs never change the same record.

async function signIn(page: Page) {
  await open(page, "/s/greenfield/login");
  await page.getByLabel("Email").fill("owner@greenfield.ng");
  await page.getByLabel("Password", { exact: true }).fill("brillianda");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/s\/greenfield$/);
}

test("search ignores accents: ola finds Ọlá", async ({ page }) => {
  await signIn(page);
  await open(page, "/s/greenfield/students");
  await page.getByPlaceholder("Search by name or admission number").fill("ola");
  await expect(page.getByText(/Ọlá/).locator("visible=true").first()).toBeVisible();
});

test("add, find, edit, move and export a student (the plan's gate)", async ({ page, isMobile }, testInfo) => {
  test.setTimeout(120_000);
  const last = testInfo.project.name === "phone" ? "Phonetest" : "Laptoptest";
  await signIn(page);

  // Add, linking an existing guardian by phone (siblings share one guardian).
  await open(page, "/s/greenfield/students/new");
  await page.getByLabel("First name").fill("Adaora");
  await page.getByLabel("Last name").fill(last);
  await page.getByText("Female", { exact: true }).click();
  await page.getByLabel("Class").selectOption({ label: "JSS 1 Gold" });
  await page.getByLabel("Guardian phone").fill("0803 001 0000");
  await page.getByLabel("Guardian name").click();
  await expect(page.getByText("This number belongs to", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Link" }).click();
  await page.getByRole("button", { name: "Save", exact: true }).locator("visible=true").click();

  await expect(page.getByRole("heading", { level: 1, name: `Adaora ${last}` })).toBeVisible();
  await expect(page.getByText("Also guardian of")).toBeVisible();

  // Edit: a new class goes into the class history.
  await page.getByRole("link", { name: "Edit", exact: true }).locator("visible=true").click();
  // Next keeps the previous page hidden in the DOM, so act on the visible one.
  await page.getByLabel("Class").locator("visible=true").selectOption({ label: "JSS 2 Blue" });
  await page.getByRole("button", { name: "Save", exact: true }).locator("visible=true").click();
  await expect(page.getByRole("heading", { level: 1, name: `Adaora ${last}` })).toBeVisible();
  await expect(page.getByText("JSS 1 Gold").locator("visible=true")).toBeVisible();
  await expect(page.getByText("JSS 2 Blue").locator("visible=true").first()).toBeVisible();

  // Find and move.
  await open(page, "/s/greenfield/students");
  await page.getByPlaceholder("Search by name or admission number").fill(last);
  if (isMobile) {
    await page.getByRole("button", { name: "Select", exact: true }).click();
    await page.getByRole("list", { name: "Students" }).getByRole("button").first().click();
  } else {
    await page.getByRole("checkbox", { name: "Select", exact: true }).first().check();
  }
  await expect(page.getByRole("region", { name: "Selected" })).toContainText("1 student selected");
  await page.getByRole("region", { name: "Selected" }).getByRole("button", { name: "Move" }).click();
  await page.getByLabel("Move to").selectOption({ label: "JSS 3 Green" });
  await page.getByRole("button", { name: "Move to JSS 3 Green" }).click();
  await expect(page.getByText("Moved 1 student to JSS 3 Green")).toBeVisible();

  // Export what's on screen.
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /^Export \d+$/ }).click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^students-\d{4}-\d{2}-\d{2}\.csv$/);
});

test("required fields are checked before saving", async ({ page }) => {
  await signIn(page);
  await open(page, "/s/greenfield/students/new");
  await page.getByRole("button", { name: "Save", exact: true }).locator("visible=true").click();
  await expect(page.getByText("Enter the first name")).toBeVisible();
  await expect(page.getByText("Choose Male or Female")).toBeVisible();
  await expect(page.getByText("Choose a class").last()).toBeVisible();
});
