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

