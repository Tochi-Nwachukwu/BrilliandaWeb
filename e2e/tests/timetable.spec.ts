import { expect, test, type Page } from "@playwright/test";
import { open } from "./helpers";

// The timetable (batch 22), on Greenfield: JSS 1 Blue and JSS 1 Gold have a full sample week, and
// Bisi Adebayo (teacher@greenfield.ng) teaches Mathematics in both.

async function signIn(page: Page, email: string) {
  await open(page, "/s/greenfield/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("brillianda");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

/** On a phone the week shows one day at a time, opening on today: go to Monday. */
async function showMonday(page: Page) {
  const monday = page.getByRole("button", { name: "Monday", exact: true }).locator("visible=true");
  if (await monday.count()) await monday.click();
}

test("a teacher sees their week, and their lessons highlighted in a class's", { tag: "@both" }, async ({ page }) => {
  await signIn(page, "teacher@greenfield.ng");
  await expect(page).toHaveURL(/\/teach$/);
  await open(page, "/s/greenfield/teach/timetable");
  await expect(page.getByText(/\d+ lessons a week, in 2 classes\./)).toBeVisible();
  await expect(page.getByText("Mathematics").locator("visible=true").first()).toBeVisible();

  await page.getByRole("tab", { name: "A class" }).click();
  await page.getByLabel("Class").selectOption({ label: "JSS 1 Gold (you teach here)" });
  await expect(page.getByText("You", { exact: true }).locator("visible=true").first()).toBeVisible();
});

test("the school edits a class's week, uploads a file, and keeps a PDF", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page, "admin@greenfield.ng");
  await expect(page).toHaveURL(/\/s\/greenfield$/);
  await open(page, "/s/greenfield/more/timetable");

  // One period, by hand.
  await page.getByRole("button", { name: "JSS 1 Blue", exact: true }).click();
  await showMonday(page);
  const monday1 = page.getByLabel("Monday, Period 1").locator("visible=true");
  await monday1.selectOption({ label: "Free" });
  await expect(monday1).toHaveValue("");

  // A class's week from a CSV, with one cell we can't place.
  await page.getByRole("button", { name: "Upload a timetable" }).click();
  const dialog = page.getByRole("dialog", { name: "Upload a timetable" });
  await dialog.getByLabel("Timetable file").setInputFiles({
    name: "jss2gold.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Day,Period 1,Period 2\nMonday,Maths,English\nTuesday,Football,MTH\n"),
  });
  await dialog.getByLabel("This timetable is for").selectOption({ label: "JSS 2 Gold" });
  await expect(dialog.getByRole("list", { name: "What we found" })).toContainText("JSS 2 Gold: 3 lessons");
  await expect(dialog.getByText("“Football” isn’t one of the school’s subjects", { exact: false })).toBeVisible();
  await dialog.getByRole("button", { name: "Replace this class’s timetable" }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "JSS 2 Gold", exact: true }).click();
  await showMonday(page);
  await expect(page.getByLabel("Monday, Period 2").locator("visible=true")).toHaveValue("gs-english-studies");

  // A PDF is kept as a document.
  await page.getByRole("button", { name: "Upload a timetable" }).click();
  await dialog.getByLabel("Timetable file").setInputFiles({ name: "Greenfield timetable.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4\n%%EOF\n") });
  await dialog.getByRole("button", { name: "Save the document" }).click();
  await expect(page.getByRole("heading", { name: "Timetable document" })).toBeVisible();

  // The bell schedule catches overlaps.
  await page.getByRole("tab", { name: "Bell schedule" }).click();
  await page.getByLabel("Starts").nth(1).fill("08:30");
  await page.getByRole("button", { name: "Save the bell schedule" }).click();
  await expect(page.getByText("Starts after Period 1 ends").first()).toBeVisible();
});
