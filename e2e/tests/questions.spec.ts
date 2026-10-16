import { expect, test, type Page } from "@playwright/test";
import { open } from "./helpers";

// The question bank (batch 24), on Greenfield. Bisi Adebayo (teacher@greenfield.ng) teaches JSS 1
// Mathematics, with five sample questions in the bank; the generator is a fake until AI is connected.

async function signIn(page: Page, email: string) {
  await open(page, "/s/greenfield/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("brillianda");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/teach$/);
}

test("a teacher generates questions, checks them, and saves them to the bank", { tag: "@both" }, async ({ page }) => {
  test.setTimeout(90_000);
  await signIn(page, "teacher@greenfield.ng");
  await open(page, "/s/greenfield/teach/questions");
  await expect(page.getByText("Simplify 6/8.").first()).toBeVisible();

  await page.getByRole("button", { name: "Generate questions" }).click();
  const dialog = page.getByRole("dialog", { name: "Generate questions" });
  await dialog.getByLabel("Topics").fill("Fractions");
  await dialog.getByLabel("Objective").fill("3");
  await dialog.getByLabel("Theory", { exact: true }).fill("1");
  await dialog.getByRole("button", { name: "Generate", exact: true }).click();

  const check = page.getByRole("dialog", { name: "Check the questions" });
  const drafts = check.getByRole("list", { name: "Draft questions" }).getByRole("article");
  await expect(drafts).toHaveCount(4);
  await check.getByRole("button", { name: "Remove" }).first().click();
  await expect(drafts).toHaveCount(3);
  await check.getByRole("button", { name: "Save 3 questions to the bank" }).click();
  await expect(check).toHaveCount(0);
  await expect(page.getByText(/From AI, checked by Bisi Adebayo/).first()).toBeVisible();
});

test("a teacher writes a question, and sees only their own subjects", async ({ page }) => {
  await signIn(page, "english@greenfield.ng");
  await open(page, "/s/greenfield/teach/questions");
  await expect(page.getByText("Simplify 6/8.")).toHaveCount(0);

  await page.getByRole("button", { name: "Write a question" }).click();
  const dialog = page.getByRole("dialog", { name: "Write a question" });
  await expect(dialog.getByLabel("Subject and class")).toContainText("English Studies");
  await dialog.getByRole("button", { name: "Add to the bank" }).click();
  await expect(dialog.getByText("Please check the highlighted fields.")).toBeVisible();
  await dialog.getByLabel("Question", { exact: true }).fill("Choose the noun: “The girl sang.”");
  for (const [i, o] of ["The", "girl", "sang"].entries()) await dialog.getByLabel(`Option ${String.fromCharCode(65 + i)}`, { exact: true }).fill(o);
  await dialog.getByRole("button", { name: "Remove option D" }).click();
  await dialog.getByLabel("Option B is the right answer").check();
  await dialog.getByRole("button", { name: "Add to the bank" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText("Choose the noun: “The girl sang.”")).toBeVisible();
});
