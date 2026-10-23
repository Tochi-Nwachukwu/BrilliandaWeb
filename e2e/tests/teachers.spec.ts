import { expect, test, type Page } from "@playwright/test";
import { open, TOURS_SEEN } from "./helpers";

// Teachers and the daily register (batch 11), on Greenfield. Each screen size uses its own sample
// teacher and form class (Bisi: JSS 1 Blue on phone, Ifeanyi: SS 1 Green on laptop), so the two runs
// never mark the same register.

async function signIn(page: Page, email: string) {
  await open(page, "/s/greenfield/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("brillianda");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

test("a form teacher takes the register, and can't open the admin screens", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const phone = testInfo.project.name === "phone";
  const [email, arm] = phone ? ["teacher@greenfield.ng", "JSS 1 Blue"] : ["physics@greenfield.ng", "SS 1 Green"];
  await signIn(page, email);
  await expect(page).toHaveURL(/\/s\/greenfield\/teach$/);
  await expect(page.getByText(arm).locator("visible=true").first()).toBeVisible();

  // The admin screens send a teacher back to their own.
  await page.goto("/s/greenfield/students");
  await expect(page).toHaveURL(/\/teach$/);

  // The register opens on the latest school day.
  await open(page, "/s/greenfield/teach/register");
  await expect(page.getByRole("heading", { name: `Register: ${arm}` })).toBeVisible();
  const rows = page.getByRole("group").filter({ has: page.getByRole("radio") });
  const first = rows.first();
  const name = (await first.locator("legend").textContent())!.trim();

  // One absent with a reason, the rest present, then save.
  await first.getByText("Absent", { exact: true }).click();
  await page.getByPlaceholder("Reason, if known (optional)").first().fill("Sick");
  const markRest = page.getByRole("button", { name: "Mark the rest present" });
  if (await markRest.isVisible()) await markRest.click();
  await page.getByRole("button", { name: /Save (register|changes)/ }).click();
  await expect(page.getByText(/Register (saved|updated)/).locator("visible=true")).toBeVisible();
  await expect(page.getByText(/Taken by/)).toBeVisible();
  await expect(page.getByRole("radio", { name: "Absent" }).first()).toBeChecked();
  expect(name.length).toBeGreaterThan(0);

  // My subjects lists their classes, with students.
  await open(page, "/s/greenfield/teach/subjects");
  await page.getByRole("link").filter({ hasText: /students/ }).first().click();
  await expect(page.getByRole("list").getByRole("listitem").first()).toBeVisible();
});

test("an admin invites a teacher, gives them a class and a subject, and they join", async ({ page, browser }, testInfo) => {
  test.setTimeout(120_000);
  const email = `zara-${testInfo.project.name}-${Date.now() % 100000}@greenfield.ng`;
  await signIn(page, "owner@greenfield.ng");
  await expect(page).toHaveURL(/\/s\/greenfield$/);
  await open(page, "/s/greenfield/teachers");
  await page.getByRole("button", { name: "Invite a teacher" }).click();
  await page.getByLabel("Full name").fill("Zara Bello");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send the invite" }).click();
  const href = await page.getByRole("link", { name: "Open the invite link" }).getAttribute("href");

  const zara = await (await browser.newContext({ storageState: TOURS_SEEN })).newPage();
  await open(zara, href!);
  await expect(zara.getByText("you’ve been invited as a teacher")).toBeVisible();
  await zara.getByLabel("New password", { exact: true }).fill("zaras-password");
  await zara.getByLabel("Type it again", { exact: true }).fill("zaras-password");
  await zara.getByRole("button", { name: "Join the school" }).click();
  await expect(zara).toHaveURL(/\/teach$/);
  await expect(zara.getByText("No classes yet")).toBeVisible();

  // The admin makes her form teacher of JSS 2 Gold and gives her English there.
  await open(page, "/s/greenfield/teachers");
  const card = page.getByRole("listitem").filter({ hasText: "Zara Bello" });
  await card.getByRole("button", { name: "Form class" }).click();
  await page.getByRole("combobox", { name: "Form class" }).selectOption({ label: "JSS 2 Gold" });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(card.getByText("JSS 2 Gold")).toBeVisible();
  await card.getByRole("button", { name: "Subjects" }).click();
  await page.getByRole("combobox", { name: "Subject", exact: true }).selectOption({ label: "English Studies" });
  await page.getByRole("checkbox", { name: /JSS 2 Gold/ }).check();
  await page.getByRole("button", { name: "Save subjects" }).click();
  await expect(card.getByText("English Studies, JSS 2 Gold")).toBeVisible();

  await zara.reload();
  await expect(zara.getByText("JSS 2 Gold").first()).toBeVisible();
  await expect(zara.getByText("English Studies")).toBeVisible();

  // Admins open any class's register, and see a student's attendance.
  await open(page, "/s/greenfield/classes/register/ga-gl1-gn1");
  await expect(page.getByRole("heading", { name: "Register: JSS 1 Blue" })).toBeVisible();
  await expect(page.getByLabel("Day")).toBeVisible();
  await open(page, "/s/greenfield/students/st1");
  await expect(page.getByRole("heading", { name: "Attendance" })).toBeVisible();
});
