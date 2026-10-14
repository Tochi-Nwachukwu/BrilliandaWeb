import { expect, test } from "@playwright/test";

// Each school at its own address (proxy.ts; plan: "Subdomain rules"). Chrome sends anything under
// .localhost to this computer, so greenfield.localhost stands in for greenfield.brillianda.com.

const at = (school: string, path = "/") => `http://${school}.localhost:3100${path}`;

test("a school's own address shows its pages and keeps it signed in", { tag: "@both" }, async ({ page }) => {
  await page.goto(at("greenfield", "/login"));
  await expect(page.getByText("Greenfield College").locator("visible=true").first()).toBeVisible();
  await page.getByLabel("Email").fill("owner@greenfield.ng");
  await page.getByLabel("Password", { exact: true }).fill("brillianda");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/greenfield\.localhost:3100\/(s\/greenfield)?$/);

  // A page by its short address.
  await page.goto(at("greenfield", "/classes"));
  await expect(page.getByRole("heading", { name: "Classes", exact: true }).locator("visible=true")).toBeVisible();

  // The school's own app manifest.
  await page.goto(at("greenfield", "/manifest.webmanifest"));
  await expect(page.locator("body")).toContainText('"name":"Greenfield College"');

  // Another school's pages aren't served here.
  const other = await page.goto(at("greenfield", "/s/surebloom/login"));
  expect(other?.status()).toBe(404);

  // Signup is sent to the main site (unit-tested in core/hosts.test.ts). Not checked here: the local
  // server's own address is localhost:3100, so Next shortens that redirect to a bare path; with real
  // domains the school's address and the main site are different hosts.

  // The API answers plainly while the backend isn't connected.
  const api = await page.goto(at("greenfield", "/api/v1/me"));
  expect(api?.status()).toBe(503);
  await expect(page.locator("body")).toContainText("api_unavailable");

  // An address with no school says so.
  await page.goto(at("nosuchschool", "/login"));
  await expect(page.getByRole("heading", { name: "There’s no school at this address" })).toBeVisible();
});
