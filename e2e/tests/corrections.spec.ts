import { expect, test, type Page } from "@playwright/test";
import { open, TOURS_SEEN } from "./helpers";

// Biodata and corrections (batch 21), on Greenfield, with the second sample parent
// (parent2@greenfield.ng, one child in JSS 2 Blue), so other parent tests aren't affected.

async function signIn(page: Page, email: string) {
  await open(page, "/s/greenfield/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("brillianda");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

async function ask(page: Page, change: (dialog: ReturnType<Page["getByRole"]>) => Promise<void>) {
  await page.getByRole("button", { name: "Ask for a correction" }).click();
  const dialog = page.getByRole("dialog", { name: "Ask for a correction" });
  await change(dialog);
  await dialog.getByRole("button", { name: "Send to the school" }).click();
  await expect(dialog).toHaveCount(0);
}

test("a parent asks for a correction; the school corrects one and declines another", async ({ page, browser }) => {
  test.setTimeout(120_000);
  await signIn(page, "parent2@greenfield.ng");
  await expect(page).toHaveURL(/\/family$/);
  await expect(page.getByRole("heading", { name: "Details" })).toBeVisible();

  // A birth date in the future is caught; then two changes in one request.
  await page.getByRole("button", { name: "Ask for a correction" }).click();
  const dialog = page.getByRole("dialog", { name: "Ask for a correction" });
  await dialog.getByLabel("It should say").fill("2999-01-01");
  await dialog.getByRole("button", { name: "Send to the school" }).click();
  await expect(dialog.getByText("A birth date can’t be in the future")).toBeVisible();
  await dialog.getByLabel("It should say").fill("2013-03-02");
  await dialog.getByRole("button", { name: "Correct something else too" }).click();
  await dialog.getByLabel("What needs correcting").nth(1).selectOption({ label: "Home address" });
  await dialog.getByLabel("It should say").nth(1).fill("12 Awolowo Road, Ikoyi");
  await dialog.getByRole("button", { name: "Send to the school" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("Waiting for the school")).toBeVisible();

  // And a second request, which the school will decline.
  await ask(page, async (d) => {
    await d.getByLabel("What needs correcting").selectOption({ label: "Other names" });
    await d.getByLabel("It should say").fill("Adewale");
  });

  const admin = await (await browser.newContext({ storageState: TOURS_SEEN })).newPage();
  await signIn(admin, "admin@greenfield.ng");
  await expect(admin).toHaveURL(/\/s\/greenfield$/);
  await open(admin, "/s/greenfield/more/corrections");
  const waiting = admin.getByRole("list", { name: "Waiting" });
  const first = waiting.getByRole("region").filter({ hasText: "Home address" });
  await expect(first.getByText("12 Awolowo Road, Ikoyi")).toBeVisible();
  await first.getByRole("button", { name: "Correct the record" }).click();
  await expect(first).toHaveCount(0);

  const second = waiting.getByRole("region").filter({ hasText: "Adewale" });
  await second.getByRole("button", { name: "Decline" }).click();
  await second.getByLabel("Why not? The parent sees this.").fill("Checked the birth certificate");
  await second.getByRole("button", { name: "Decline" }).first().click();
  await expect(admin.getByText("Nothing waiting")).toBeVisible();

  // The parent sees both answers, and the corrected address.
  await page.reload();
  await expect(page.getByText("12 Awolowo Road, Ikoyi").first()).toBeVisible();
  await expect(page.getByText("Corrected", { exact: true })).toBeVisible();
  await expect(page.getByText("The school said: “Checked the birth certificate”")).toBeVisible();
});
