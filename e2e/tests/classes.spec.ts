import { expect, test, type Page } from "@playwright/test";
import { open } from "./helpers";

// Classes and arms (batch 6). The phone run sets up Brookfield and the laptop run Cedarwood, so the
// two never change each other's school; the tests that change it go in order.

async function signIn(page: Page, school: string, email: string) {
  await open(page, `/s/${school}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("brillianda");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/s/${school}$`));
}

const fresh = (project: string) => (project === "phone" ? { school: "brookfield", email: "owner@brookfield.ng" } : { school: "cedarwood", email: "owner@cedarwood.ng" });

test("a school with classes sees them by section", async ({ page }) => {
  await signIn(page, "greenfield", "owner@greenfield.ng");
  await open(page, "/s/greenfield/classes");
  await expect(page.getByRole("heading", { name: "Junior secondary" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Senior secondary" })).toBeVisible();
  await expect(page.getByText("18 classes in 6 levels", { exact: false })).toBeVisible();
});

test.describe.serial("the quick setup", () => {
  test("JSS 1 to SS 3 with three flower arms makes 18 classes (the plan's gate)", async ({ page }, testInfo) => {
    const { school, email } = fresh(testInfo.project.name);
    await signIn(page, school, email);
    await open(page, `/s/${school}/classes`);

    await expect(page.getByRole("heading", { name: "Set up your classes" })).toBeVisible();
    // A secondary school starts at JSS 1 and ends at SS 3.
    await expect(page.getByLabel("Our first class")).toHaveValue("jss1");
    await expect(page.getByLabel("Our last class")).toHaveValue("ss3");
    await expect(page.getByLabel("Class 6 name")).toHaveValue("SS 3");

    await page.getByRole("button", { name: "Next: arms" }).click();
    await page.getByRole("button", { name: "More: Arms in every class" }).click();
    await page.getByRole("button", { name: "Flowers" }).click();
    await expect(page.getByText("This creates 18 classes: JSS 1 Anthurium, JSS 1 Begonia, JSS 1 Calla Lily and 15 more.")).toBeVisible();
    await page.getByRole("button", { name: "Create 18 classes" }).click();

    await expect(page.getByText("18 classes in 6 levels", { exact: false })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Junior secondary" })).toBeVisible();
  });

  test("renaming an arm renames it in every class, and the rules hold", async ({ page }, testInfo) => {
    const { school, email } = fresh(testInfo.project.name);
    await signIn(page, school, email);
    await open(page, `/s/${school}/classes`);

    await page.getByRole("button", { name: "Anthurium ANT" }).click();
    await page.getByLabel("Arm name").fill("Amaryllis");
    await page.getByLabel("Short code").fill("AMA");
    await page.getByRole("button", { name: "Rename everywhere" }).click();
    await expect(page.getByRole("button", { name: "Amaryllis AMA" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Anthurium ANT" })).toHaveCount(0);

    // A class can take one more arm of its own.
    await page.getByRole("button", { name: "Add an arm to JSS 1" }).click();
    await page.getByLabel("New arm name").fill("Daisy");
    await page.getByLabel("Short code").fill("DAI");
    await page.getByRole("button", { name: "Add the new arm" }).click();
    await expect(page.getByText("19 classes in 6 levels", { exact: false })).toBeVisible();

    // The checklist now has classes and arms ticked off.
    await open(page, `/s/${school}`);
    await expect(page.getByText("Add your classes (done)")).toBeAttached();
    await expect(page.getByText("Split classes into arms (done)")).toBeAttached();
  });
});
