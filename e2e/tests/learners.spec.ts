import { expect, test, type Page } from "@playwright/test";
import { open, TOURS_SEEN } from "./helpers";

// Students and the student portal (batch 23), on Greenfield. The sample student
// (student@greenfield.ng) is Chiamaka Grace Okafor in JSS 1 Blue.

async function signIn(page: Page, email: string) {
  await open(page, "/s/greenfield/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("brillianda");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test("the school invites a student, who joins and lands in the portal", async ({ page, browser }) => {
  await signIn(page, "admin@greenfield.ng");
  await expect(page).toHaveURL(/\/s\/greenfield$/);
  await open(page, "/s/greenfield/more/student-accounts");
  await page.getByLabel("Search", { exact: true }).fill("Chinedu Bello");
  const row = page.getByRole("list", { name: "Students" }).getByRole("listitem").filter({ hasText: "Chinedu Bello" });
  await expect(row.getByText("Not invited")).toBeVisible();
  await row.getByRole("button", { name: "Invite" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Student’s email").fill("not-an-email");
  await dialog.getByRole("button", { name: "Send the invite" }).click();
  await expect(dialog.getByText("Please check the email.").or(dialog.getByText(/email address/))).toBeVisible();
  await dialog.getByLabel("Student’s email").fill("chinedu.bello@example.com");
  await dialog.getByRole("button", { name: "Send the invite" }).click();
  await expect(row.getByText("Invited", { exact: true })).toBeVisible();
  const link = await page.getByRole("link", { name: /Open Chinedu’s invite/ }).getAttribute("href");

  const student = await (await browser.newContext({ storageState: TOURS_SEEN })).newPage();
  await open(student, link!);
  await expect(student.getByText("been invited to the student portal", { exact: false })).toBeVisible();
  await student.getByLabel("New password").fill("brillianda-student");
  await student.getByLabel("Type it again").fill("brillianda-student");
  await student.getByRole("button", { name: "Join the school" }).click();
  await expect(student).toHaveURL(/\/learn$/);
  await expect(student.getByRole("heading", { name: /, Chinedu$/ })).toBeVisible();
});
