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

test("a school without classes is sent to set them up first", async ({ page }) => {
  await signIn(page, "royalheights", "owner@royalheights.ng");
  await open(page, "/s/royalheights/subjects");
  await expect(page.getByText("Set up your classes first")).toBeVisible();
});

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

test("the laptop grid cycles compulsory, elective, off", async ({ page, isMobile }) => {
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

test("a subject can be renamed and stays linked to the catalogue", async ({ page, isMobile }) => {
  await signIn(page, "greenfield", "owner@greenfield.ng");
  await open(page, "/s/greenfield/subjects");
  // Each screen size renames its own subject, so the two runs never trip over each other.
  const [subject, renamed] = isMobile ? ["Business Studies BUS", "Business"] : ["Government GOV", "Government and Politics"];
  if (isMobile) await page.getByRole("tab", { name: /^JSS 1 / }).click();
  else await page.getByRole("button", { name: subject }).click();
  if (isMobile) await page.getByRole("button", { name: subject }).click();
  await expect(page.getByText("From the national catalogue. Renaming keeps it linked.")).toBeVisible();
  await page.getByLabel("Subject name").fill(renamed);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Subject saved")).toBeVisible();
});

const fresh = (project: string) => (project === "phone" ? { school: "brookfield", email: "owner@brookfield.ng" } : { school: "cedarwood", email: "owner@cedarwood.ng" });

test("the first pick has the 2025 list ticked, and attaches subjects to their classes", async ({ page }, testInfo) => {
  const { school, email } = fresh(testInfo.project.name);
  await signIn(page, school, email);
  await open(page, `/s/${school}/classes`);
  // The class tests set up these schools; on a fresh server, set them up here.
  if (await page.getByRole("heading", { name: "Set up your classes" }).isVisible()) {
    await page.getByRole("button", { name: "Next: arms" }).click();
    await page.getByRole("button", { name: /^Create \d+ classes$/ }).click();
    await expect(page.getByRole("heading", { name: "Junior secondary" })).toBeVisible();
  }
  await open(page, `/s/${school}/subjects`);
  await expect(page.getByRole("heading", { name: "Choose your subjects" })).toBeVisible();
  await expect(page.getByLabel(/^Biology/)).toBeChecked();

  await page.getByPlaceholder("e.g. Phonics").fill("Verbal Reasoning");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: /^Add \d+ subjects$/ }).click();

  await expect(page.getByRole("heading", { name: "Subjects", exact: true })).toBeVisible();
  await open(page, `/s/${school}`);
  await expect(page.getByText("Choose your subjects (done)")).toBeAttached();
});
