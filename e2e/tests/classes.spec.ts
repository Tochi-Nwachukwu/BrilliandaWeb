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

});
