import { expect, test, type Page } from "@playwright/test";
import { open } from "./helpers";

// Classes › Edit arms: every arm in one place. Each screen size edits its own small school
// (JSS 1 to 3 in Blue and Gold, one student in JSS 1 Blue).

async function signIn(page: Page, school: string) {
  await open(page, `/s/${school}/login`);
  await page.getByLabel("Email").fill(`owner@${school}.ng`);
  await page.getByLabel("Password", { exact: true }).fill("brillianda");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/s/${school}$`));
}

const card = (page: Page, name: string) => page.getByRole("listitem", { name, exact: true });

test("rename, add, reorder and choose classes for arms, then save once", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const school = testInfo.project.name === "phone" ? "elmwood" : "willowbank";
  await signIn(page, school);
  await open(page, `/s/${school}/classes`);
  await page.getByRole("link", { name: "Edit arms" }).first().click();
  await expect(page).toHaveURL(/\/classes\/arms$/);
  await expect(page.getByText("2 arms, 6 classes in all")).toBeVisible();

  // The arm with a student can't be deleted, and its class can't be unticked.
  await expect(card(page, "Blue").getByRole("button", { name: "Delete" })).toBeDisabled();
  await expect(card(page, "Blue").getByRole("button", { name: /JSS1/ })).toBeDisabled();

  // Rename Gold (its code follows only if typed), and take it out of JSS 3.
  await card(page, "Gold").getByLabel("Arm name").fill("Yellow");
  await card(page, "Yellow").getByLabel("Code").fill("yel");
  await card(page, "Yellow").getByRole("button", { name: /JSS3/ }).click();

  // A new arm: its code is made from the name; it starts in every class. Leave it out of JSS 1.
  await page.getByRole("button", { name: "Add an arm" }).click();
  await page.getByLabel("Arm name").last().fill("Purple");
  await expect(page.getByLabel("Code").last()).toHaveValue("PUR");
  await card(page, "Purple").getByRole("button", { name: /JSS1/ }).click();
  // Purple goes to the top.
  await card(page, "Purple").getByRole("button", { name: "Move Purple up" }).click();
  await card(page, "Purple").getByRole("button", { name: "Move Purple up" }).click();
  await expect(page.getByText("3 arms, 7 classes in all")).toBeVisible();

  // Two arms can't share a code.
  await card(page, "Purple").getByLabel("Code").fill("BLU");
  await page.getByRole("button", { name: "Save arms" }).click();
  await expect(page.getByText("Two arms can’t share a code")).toBeVisible();
  await card(page, "Purple").getByLabel("Code").fill("PUR");

  await page.getByRole("button", { name: "Save arms" }).click();
  await expect(page.getByText("Arms saved").locator("visible=true")).toBeVisible();
  await expect(page).toHaveURL(/\/classes$/);

  // The classes follow: JSS 1 has Blue and Yellow, JSS 2 all three, JSS 3 Purple and Blue.
  const arms = (level: string) => page.getByRole("list", { name: `${level} arms` }).getByRole("button");
  await expect(arms("JSS 1")).toHaveCount(2);
  await expect(arms("JSS 2")).toHaveCount(3);
  await expect(arms("JSS 3")).toHaveCount(2);
  const chips = page.getByRole("button", { name: /^Purple PUR|^Blue BLU|^Yellow YEL/ });
  await expect(chips.first()).toHaveText(/Purple/);
});

test("every class keeps at least one arm", async ({ page }, testInfo) => {
  const school = testInfo.project.name === "phone" ? "elmwood" : "willowbank";
  await signIn(page, school);
  await open(page, `/s/${school}/classes/arms`);
  // Take every arm out of JSS 2 (none of them has students there).
  for (const item of await page.getByRole("listitem").filter({ has: page.getByLabel("Arm name") }).all()) {
    const jss2 = item.getByRole("button", { name: /JSS2/ });
    if ((await jss2.getAttribute("aria-pressed")) === "true") await jss2.click();
  }
  await expect(page.getByText("JSS 2 has no arm. Every class needs at least one.")).toBeVisible();
  await page.getByRole("button", { name: "Save arms" }).click();
  await expect(page.getByText("Give JSS 2 at least one arm.")).toBeVisible();
});
