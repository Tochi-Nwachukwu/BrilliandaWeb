import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { open } from "./helpers";

// The plan's accessibility bar (WCAG 2.2 AA): every screen is scanned by axe at both sizes, and any
// problem it can find automatically fails the run. Axe can't judge everything (whether a label
// makes sense, say), so this is a floor, not the whole check. Read-only: nothing here saves.

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function scan(page: Page, url: string) {
  // The marketing site is plain HTML with its own script, so it has no hydrated marker.
  if (url === "/") await page.goto(url, { waitUntil: "load" });
  else await open(page, url);
  // Let entrance animations settle, so colours are checked as people see them.
  await page.waitForTimeout(1200);
  const { violations } = await new AxeBuilder({ page })
    .withTags(TAGS)
    // The footer's giant faded word is a watermark, hidden from screen readers: decoration, which
    // WCAG leaves out of the contrast rule.
    .exclude(".ghost")
    // White text on the hero photo, under a dark veil. Axe can't see a background image, so it
    // guesses the colour behind; checked by eye on screenshots at both sizes instead.
    .exclude(".hero .btn-on-dark")
    .exclude(".scroll-cue")
    .analyze();
  const report = violations.map((v) => `${v.id} (${v.impact}): ${v.help}\n${v.nodes.map((n) => `    ${n.target.join(" ")}  ${n.failureSummary?.split("\n")[1]?.trim() ?? ""}`).join("\n")}`);
  expect.soft(report, `Accessibility problems on ${url}`).toEqual([]);
}

async function signIn(page: Page) {
  await open(page, "/s/greenfield/login");
  await page.getByLabel("Email").fill("owner@greenfield.ng");
  await page.getByLabel("Password", { exact: true }).fill("brillianda");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/s\/greenfield$/);
}

const PUBLIC = ["/", "/login", "/signup", "/s/greenfield/login", "/s/greenfield/forgot-password", "/s/greenfield/magic-link"];

for (const url of PUBLIC) {
  test(`public screen ${url} passes the accessibility scan`, { tag: "@both" }, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("brillianda-seen", "1"));
    await scan(page, url);
  });
}

const SCHOOL = [
  "",
  "/classes",
  "/classes/arms",
  "/subjects",
  "/students",
  "/students/new",
  "/students/import",
  "/more",
  "/more/admins",
  "/more/sessions",
  "/more/admission-numbers",
  "/more/branding",
  "/more/history",
];

test("every screen inside a school passes the accessibility scan", { tag: "@both" }, async ({ page }) => {
  test.setTimeout(180_000);
  await signIn(page);
  for (const path of SCHOOL) await test.step(path || "home", () => scan(page, `/s/greenfield${path}`));

  // One sample student's profile and edit screen (st1 is Greenfield's first seeded student).
  const href = "/s/greenfield/students/st1";
  await test.step("student profile", () => scan(page, href));
  await test.step("edit student", () => scan(page, `${href}/edit`));
});
