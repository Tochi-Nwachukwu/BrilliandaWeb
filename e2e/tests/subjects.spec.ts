import { expect, test, type Page } from "@playwright/test";
import { open } from "./helpers";

// Subjects (batch 7). Greenfield already has classes and subjects. The setup test uses Brookfield
// (phone) and Cedarwood (laptop), which the class tests have given classes; it runs after them.

async function signIn(page: Page, school: string, email: string) {
  await open(page, `/s/${school}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("brillianda");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/s/${school}$`));
}

test("each class level's subjects can be set on a phone (the plan's gate)", async ({ page, isMobile }) => {
  test.skip(!isMobile, "The phone layout");
  await signIn(page, "greenfield", "admin@greenfield.ng");
  await open(page, "/s/greenfield/subjects");

  for (const level of ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"]) {
    await page.getByRole("tab", { name: new RegExp(`^${level} `) }).click();
    const list = page.getByRole("list", { name: `${level} subjects` });
    await expect(list).toBeVisible();
    // Take one subject off and put it back as an elective.
    const group = list.getByRole("group").first();
    await group.getByRole("button", { name: "Off" }).click();
    await expect(group.getByRole("button", { name: "Off" })).toHaveAttribute("aria-pressed", "true");
    await group.getByRole("button", { name: "Elective" }).click();
    await expect(group.getByRole("button", { name: "Elective" })).toHaveAttribute("aria-pressed", "true");
  }
});

test("the laptop grid cycles compulsory, elective, off", { tag: "@both" }, async ({ page, isMobile }) => {
  test.skip(isMobile, "The laptop layout");
  await signIn(page, "greenfield", "admin@greenfield.ng");
  await open(page, "/s/greenfield/subjects");
  const cell = page.getByRole("button", { name: /^Mathematics in JSS 1: / });
  await expect(cell).toHaveAccessibleName("Mathematics in JSS 1: Compulsory");
  await cell.click();
  await expect(cell).toHaveAccessibleName("Mathematics in JSS 1: Elective");
  await cell.click();
  await expect(cell).toHaveAccessibleName("Mathematics in JSS 1: not taught");
  await cell.click();
  await expect(cell).toHaveAccessibleName("Mathematics in JSS 1: Compulsory");
});

const fresh = (project: string) => (project === "phone" ? { school: "brookfield", email: "owner@brookfield.ng" } : { school: "cedarwood", email: "owner@cedarwood.ng" });
