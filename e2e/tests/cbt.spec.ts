import { expect, test, type Page } from "@playwright/test";
import { open, TOURS_SEEN } from "./helpers";

// CBT (batch 25), on Greenfield. "Fractions: class test" is open for JSS 1 Blue: five questions
// (one of them theory) by Bisi Adebayo; the sample student, Chiamaka, is in JSS 1 Blue.

async function signIn(page: Page, email: string, lands: RegExp) {
  await open(page, "/s/greenfield/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("brillianda");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(lands);
}

test("a student takes a test; the teacher marks it, sends the scores and sets another", async ({ page, browser }) => {
  test.setTimeout(150_000);
  await signIn(page, "student@greenfield.ng", /\/learn$/);
  await open(page, "/s/greenfield/learn/tests");
  await page.getByRole("link", { name: /Fractions: class test/ }).click();
  await page.getByRole("button", { name: "Start the test" }).click();
  await expect(page.getByRole("timer")).toBeVisible();

  // Answer each question, whatever order this student got them in.
  const questions = page.getByRole("navigation", { name: "Questions" }).getByRole("button");
  const count = await questions.count();
  for (let i = 0; i < count; i++) {
    await questions.nth(i).click();
    const radio = page.getByRole("radio").first();
    if (await radio.count()) await radio.check();
    else await page.getByLabel("Your answer").fill(i % 2 ? "numerator" : "1/3 + 1/4 = 7/12, so 5/12 is left");
  }
  await expect(page.getByText("Saved")).toBeVisible();
  await page.getByRole("button", { name: "Submit the test" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Submit", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Submitted" })).toBeVisible();
  await expect(page.getByText(/so far: your teacher still marks the written answers/)).toBeVisible();

  // The teacher marks the theory answer and sends the scores to CA1.
  const teacher = await (await browser.newContext({ storageState: TOURS_SEEN })).newPage();
  await signIn(teacher, "teacher@greenfield.ng", /\/teach$/);
  await open(teacher, "/s/greenfield/teach/tests/tt1");
  const row = teacher.getByRole("list", { name: "Students" }).getByRole("listitem").filter({ hasText: "Chiamaka Grace Okafor" });
  await row.getByRole("button", { name: "Mark" }).click();
  const dialog = teacher.getByRole("dialog");
  await dialog.getByLabel("Marks, out of 5").fill("4");
  await dialog.getByRole("button", { name: "Save mark" }).click();
  await expect(teacher.getByText("Mark saved").first()).toBeVisible();
  await teacher.keyboard.press("Escape");
  await teacher.getByRole("button", { name: /^Send \d+ scores? to CA1$/ }).click();
  await expect(teacher.getByText(/Sent \d+ scores to CA1/).first()).toBeVisible();

  // And sets a new test from the bank.
  await open(teacher, "/s/greenfield/teach/tests/new");
  await teacher.getByLabel("Title").fill("Fractions: second test");
  await teacher.getByRole("checkbox", { name: "JSS 1 Blue" }).check();
  await teacher.getByRole("button", { name: /^Choose all/ }).click();
  await teacher.getByRole("button", { name: "Set the test" }).click();
  await expect(teacher.getByRole("heading", { name: "Fractions: second test" })).toBeVisible();
});
