import { expect, test, type Page } from "@playwright/test";
import { open, TOURS_SEEN } from "./helpers";

// Results, batch 14: score sheets on Greenfield. Each screen size fills a different sheet for
// JSS 1 Gold (Mathematics by Bisi on phone, English Studies by Kemi on laptop), so the runs never
// touch the same scores.

async function signIn(page: Page, email: string) {
  await open(page, "/s/greenfield/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("brillianda");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test("a teacher fills a sheet, marks it complete, and an admin unlocks it", async ({ page, browser }, testInfo) => {
  test.setTimeout(150_000);
  const [email, subject] = testInfo.project.name === "phone" ? ["teacher@greenfield.ng", "Mathematics"] : ["english@greenfield.ng", "English Studies"];
  await signIn(page, email);
  await expect(page).toHaveURL(/\/teach$/);
  await open(page, "/s/greenfield/teach/subjects");
  await page.getByRole("link").filter({ hasText: "JSS 1 Gold" }).filter({ hasText: subject }).click();
  await expect(page.getByRole("heading", { name: `${subject}, JSS 1 Gold` })).toBeVisible();

  // Too high a score is caught in the box; the grid explains, and the save waits.
  const first = page.locator('input[id^="cell-"]').first();
  await first.fill("25");
  await first.press("Tab");
  await expect(page.getByText("Must be 20 or less").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Mark complete" })).toBeDisabled();

  // Fill every box: ABS for the first, 15 for the rest. Totals and grades appear as it fills.
  await first.fill("ABS");
  await first.press("Tab");
  for (const cell of await page.locator('input[id^="cell-"]').all()) {
    if ((await cell.inputValue()) === "") {
      await cell.fill("15");
      await cell.press("Tab");
    }
  }
  await expect(page.getByText(/(\d+) of \1 students complete/)).toBeVisible();
  await page.getByRole("button", { name: "Mark complete" }).click();
  await expect(page.getByText("Marked complete", { exact: true }).locator("visible=true").first()).toBeVisible();
  await expect(page.getByText("This sheet is marked complete.", { exact: false })).toBeVisible();
  await expect(first).toBeDisabled();

  // The teacher asks to unlock; an admin sees the request and unlocks.
  await page.getByRole("button", { name: "Ask to unlock" }).click();
  await page.getByLabel("What needs changing?").fill("One CA score was typed wrongly.");
  await page.getByRole("button", { name: "Send the request" }).click();
  await expect(page.getByText(/You asked to unlock it/)).toBeVisible();

  const admin = await (await browser.newContext({ storageState: TOURS_SEEN })).newPage();
  await signIn(admin, "owner@greenfield.ng");
  await expect(admin).toHaveURL(/\/s\/greenfield$/);
  await open(admin, "/s/greenfield/results");
  await admin.getByRole("link").filter({ hasText: `${subject}, JSS 1 Gold` }).click();
  await expect(admin.getByText("One CA score was typed wrongly.", { exact: false }).first()).toBeVisible();
  await admin.getByRole("button", { name: "Unlock", exact: true }).click();
  await expect(admin.getByText("Unlocked").locator("visible=true")).toBeVisible();

  await page.reload();
  await expect(page.locator('input[id^="cell-"]').first()).toBeEnabled();
});

test("broadsheet, remarks and ratings, a report card, and publishing a class", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await signIn(page, "owner@greenfield.ng");
  await expect(page).toHaveURL(/\/s\/greenfield$/);

  // JSS 1 Blue isn't finished, so it can't be published yet.
  await open(page, "/s/greenfield/results/ga-gl1-gn1/broadsheet");
  await expect(page.getByRole("table")).toBeVisible();
  await expect(page.getByRole("button", { name: "Publish results" })).toBeDisabled();

  // Remarks and a rating for the first student (each screen size writes its own words).
  const words = testInfo.project.name === "phone" ? "A steady term from the phone." : "A steady term from the laptop.";
  await open(page, "/s/greenfield/results/ga-gl1-gn1/remarks");
  const first = page.getByRole("listitem").filter({ has: page.getByText("Class teacher’s remark") }).first();
  const name = (await first.locator("b").first().textContent())!.trim();
  await first.getByLabel("Class teacher’s remark").fill(words);
  await first.getByLabel("Principal’s remark").click();
  await expect(page.getByText("Saved.", { exact: false })).toBeVisible();
  await first.locator('label[title="Very good"]').first().click();
  await expect(first.getByLabel("4, Very good").first()).toBeChecked();

  // The report card shows it, with attendance and the grade key.
  await open(page, "/s/greenfield/results/ga-gl1-gn1/broadsheet");
  await page.getByRole("link", { name }).click();
  await expect(page.getByText(words)).toBeVisible();
  await expect(page.getByText(/Present \d+ of \d+ school days/)).toBeVisible();
  await expect(page.getByText(/Grades: A 70\+ Excellent/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Print or save as PDF" })).toBeVisible();

  // JSS 2 Blue is complete: publish it, then take it back (phone only, so the runs don't race).
  if (testInfo.project.name === "phone") {
    await open(page, "/s/greenfield/results/ga-gl2-gn1");
    await page.getByRole("button", { name: "Publish results" }).click();
    await expect(page.getByText("JSS 2 Blue results published").locator("visible=true")).toBeVisible();
    await expect(page.getByText("Published", { exact: true })).toBeVisible();

    // A JSS 2 Blue parent now sees the average and the report card.
    const parent = await (await page.context().browser()!.newContext({ storageState: TOURS_SEEN })).newPage();
    await signIn(parent, "parent2@greenfield.ng");
    await expect(parent).toHaveURL(/\/family$/);
    const child = parent.getByRole("link").filter({ hasText: "JSS 2 Blue" });
    if (await child.count()) await child.first().click();
    await expect(parent.getByText(/^Average/).first()).toBeVisible();
    await parent.getByRole("link", { name: "Open the report card" }).click();
    await expect(parent.getByText(/Report card ·/).locator("visible=true").first()).toBeVisible();
    const cardUrl = parent.url();

    await page.getByRole("button", { name: "Take back results" }).click();
    await expect(page.getByText("JSS 2 Blue results taken back").locator("visible=true")).toBeVisible();
    // Taken back: the card is gone for the parent.
    await open(parent, new URL(cardUrl).pathname);
    await expect(parent.getByText("This page isn’t here")).toBeVisible();
  }
});
