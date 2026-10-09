import { expect, test, type Page } from "@playwright/test";
import { open } from "./helpers";

// More › Branding (plan: "School branding"): name, colour and logo, owner only. Each screen size
// brands its own fresh school, so the two runs never change the same one.

// An 8 × 8 green PNG, enough for the browser to decode and shrink.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEUlEQVR4nGOQy3bFihiGlgQAFjQzgeXra9QAAAAASUVORK5CYII=", "base64");

async function signIn(page: Page, school: string, email: string) {
  await open(page, `/s/${school}/login`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("brillianda");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/s/${school}$`));
}

test("an owner sets the school's name, colour and logo", { tag: "@both" }, async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  const school = testInfo.project.name === "phone" ? "oakridge" : "pinecrest";
  await signIn(page, school, `owner@${school}.ng`);

  // A fresh school is offered the step, but it doesn't jump ahead of the calendar.
  await expect(page.getByText("Add your logo and colour (optional)")).toBeVisible();
  await expect(page.getByRole("link", { name: "Set your calendar" })).toBeVisible();
  await page.getByRole("link", { name: /Add\s*: Add your logo and colour/ }).click();
  await expect(page.getByRole("heading", { name: "Branding", exact: true }).locator("visible=true")).toBeVisible();

  // Colour from a swatch, then a new name; the preview follows before saving.
  await page.getByLabel("Green", { exact: true }).check({ force: true });
  await expect(page.getByLabel("Or type a colour")).toHaveValue("#1E6B45");
  const name = page.getByLabel("School name");
  const newName = `${(await name.inputValue()).split(" ")[0]} Grammar School`;
  await name.fill(newName);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Branding saved").locator("visible=true")).toBeVisible();

  // The whole app now wears the colour, and the header carries the new name.
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--color-primary").trim())).toBe("#1E6B45");
  await expect(page.getByText(newName).locator("visible=true").first()).toBeVisible();

  // A typed colour that isn't one gets a plain message.
  await page.getByLabel("Or type a colour").fill("green");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText(/Enter a colour like #1E6B45/)).toBeVisible();
  await page.getByLabel("Green", { exact: true }).check({ force: true });

  // SVG is refused; a PNG becomes the logo.
  const input = page.getByTestId("logo-input");
  await input.setInputFiles({ name: "crest.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>") });
  await expect(page.getByText(/SVG logos aren’t accepted/)).toBeVisible();
  await input.setInputFiles({ name: "crest.png", mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("Logo saved").locator("visible=true")).toBeVisible();
  await expect(page.getByRole("img", { name: `${newName} logo` })).toBeVisible();

  // The app icon draws the logo; the checklist step is done.
  const icon = await page.request.get(`/s/${school}/app-icon/192`);
  expect(icon.status()).toBe(200);
  expect(icon.headers()["content-type"]).toBe("image/png");
  await open(page, `/s/${school}`);
  await expect(page.getByText("Add your logo and colour (done)")).toBeAttached();

  // Removing the logo brings the initials back.
  await open(page, `/s/${school}/more/branding`);
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(page.getByText("Logo removed").locator("visible=true")).toBeVisible();
  await expect(page.getByRole("button", { name: "Upload logo" })).toBeVisible();
});

test("an admin sees the branding but can't change it", async ({ page }) => {
  await signIn(page, "greenfield", "admin@greenfield.ng");
  await open(page, "/s/greenfield/more/branding");
  await expect(page.getByText("Only the school owner can change the name, colour and logo.")).toBeVisible();
  await expect(page.getByLabel("School name")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Upload logo" })).toHaveCount(0);
});
