import { expect, test, type Page } from "@playwright/test";
import { open } from "./helpers";

// Home, the setup checklist, and sessions and terms (batch 5). Runs at phone and laptop size.
// Royal Heights and Kingsway have no calendar yet; Greenfield has one. The phone run uses Royal
// Heights and the laptop run Kingsway, so the two never change each other's school; within a run
// the tests that change it go in order.

async function signIn(page: Page, school: string, email: string) {
  await open(page, `/s/${school}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("brillianda");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/s/${school}$`));
}

test("Home greets you and shows recent changes", async ({ page }) => {
  await signIn(page, "greenfield", "owner@greenfield.ng");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/Good (morning|afternoon|evening), Amaka/);
  // Other tests keep changing Greenfield, so check the card has entries rather than a particular one.
  await expect(page.getByRole("heading", { name: "Recent changes" })).toBeVisible();
  await expect(page.getByText(/ago$|just now$/).first()).toBeVisible();
  // Greenfield has finished every setup step, so the checklist has gone for good.
  await expect(page.getByRole("heading", { name: /^Finish setting up/ })).toHaveCount(0);
  await expect(page.getByText(/is set up:/)).toBeVisible();
});

test("an admin's checklist leaves out inviting admins", async ({ page }) => {
  // admin@greenfield.ng is also an admin at Surebloom, which hasn't finished setting up.
  await signIn(page, "surebloom", "admin@greenfield.ng");
  await expect(page.getByRole("heading", { name: "Finish setting up Surebloom School" })).toBeVisible();
  await expect(page.getByText("Invite an admin")).toHaveCount(0);
});

const fresh = (project: string) => (project === "phone" ? { school: "royalheights", email: "owner@royalheights.ng", name: "Royal Heights College" } : { school: "kingsway", email: "owner@kingsway.ng", name: "Kingsway Academy" });

test.describe.serial("a school without a calendar", () => {
  test("the checklist leads to the calendar, and saving ticks it off", async ({ page }, testInfo) => {
    const { school, email } = fresh(testInfo.project.name);
    await signIn(page, school, email);
    await expect(page.getByText("0 of 6 done", { exact: false })).toBeVisible();
    await page.getByRole("link", { name: "Set your calendar" }).click();

    await expect(page).toHaveURL(/\/more\/sessions$/);
    await expect(page.getByText("These are suggested dates", { exact: false })).toBeVisible();
    await expect(page.getByLabel("Term 1 name")).toHaveValue("First Term");

    // A date that overlaps the term before is caught, under that field.
    await page.getByLabel("Starts").nth(1).fill("2026-12-01");
    await page.getByRole("button", { name: "Save the calendar" }).click();
    await expect(page.getByText("Starts after First Term ends")).toBeVisible();

    await page.getByRole("button", { name: "Use suggested dates" }).click();
    await page.getByRole("button", { name: "Autumn, Spring, Summer" }).click();
    await expect(page.getByLabel("Term 1 name")).toHaveValue("Autumn Term");
    await page.getByRole("button", { name: "Save the calendar" }).click();
    await expect(page.getByText("calendar saved", { exact: false })).toBeVisible();

    await open(page, `/s/${school}`);
    await expect(page.getByText("1 of 6 done", { exact: false })).toBeVisible();
    await expect(page.getByText("Set your academic calendar (done)")).toBeAttached();
  });

  test("two terms, and hiding the checklist", async ({ page }, testInfo) => {
    const { school, email, name } = fresh(testInfo.project.name);
    await signIn(page, school, email);
    await open(page, `/s/${school}/more/sessions`);
    await page.getByRole("button", { name: "2", exact: true }).click();
    await expect(page.getByLabel("Term 3 name")).toHaveCount(0);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("calendar saved", { exact: false })).toBeVisible();
    await expect(page.getByText("2 terms.", { exact: false })).toBeVisible();

    await open(page, `/s/${school}`);
    await page.getByRole("button", { name: "Hide" }).click();
    await expect(page.getByRole("button", { name: "Show the checklist" })).toBeVisible();
    await page.getByRole("button", { name: "Show the checklist" }).click();
    await expect(page.getByRole("heading", { name: `Finish setting up ${name}` })).toBeVisible();
  });
});
