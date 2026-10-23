import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { open } from "./helpers";

// The plan's accessibility bar (WCAG 2.2 AA): the key screens are scanned by axe (one of each kind: forms, lists, grids, dialogs), and any
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

async function signInAs(page: Page, email: string, lands: RegExp) {
  await page.context().clearCookies();
  await open(page, "/s/greenfield/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("brillianda");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(lands);
}

test("the public screens and the team console pass the accessibility scan", async ({ page }) => {
  test.setTimeout(150_000);
  await page.addInitScript(() => localStorage.setItem("brillianda-seen", "1"));
  for (const url of ["/", "/signup", "/s/greenfield/login", "/s/greenfield/forgot-password", "/console/login"]) await test.step(url, () => scan(page, url));
  await page.getByLabel("Email").fill("team@brillianda.com");
  await page.getByLabel("Password", { exact: true }).fill("brillianda");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/console$/);
  for (const url of ["/console", "/console/schools/greenfield"]) await test.step(url, () => scan(page, url));
});

// One of each kind of school screen: setup, lists, a record, forms, grids and results.
const SCHOOL = [
  ["", "/classes", "/subjects", "/students", "/students/st1", "/students/new", "/students/import", "/more"],
  ["/more/sessions", "/more/branding", "/more/history", "/teachers", "/more/timetable", "/more/book-lists", "/classes/register/ga-gl1-gn1"],
  ["/results/ga-gl1-gn1", "/results/ga-gl1-gn1/gs-mathematics", "/results/ga-gl1-gn1/broadsheet", "/results/ga-gl1-gn1/report/st1", "/more/promotion", "/more/questions", "/more/tests/tt1"],
];

for (const [i, paths] of SCHOOL.entries()) {
  test(`school screens (part ${i + 1} of ${SCHOOL.length}) pass the accessibility scan`, async ({ page }) => {
    test.setTimeout(150_000);
    await signInAs(page, "owner@greenfield.ng", /\/s\/greenfield$/);
    for (const path of paths) await test.step(path || "home", () => scan(page, `/s/greenfield${path}`));
  });
}

test("teachers’, parents’ and students’ screens pass the accessibility scan", async ({ page }) => {
  test.setTimeout(180_000);
  await signInAs(page, "physics@greenfield.ng", /\/teach$/);
  for (const path of ["/teach", "/teach/register", "/teach/subjects", "/teach/timetable"]) await test.step(path, () => scan(page, `/s/greenfield${path}`));
  await signInAs(page, "parent@greenfield.ng", /\/family$/);
  await test.step("/family", () => scan(page, "/s/greenfield/family"));
  await signInAs(page, "student@greenfield.ng", /\/learn$/);
  for (const path of ["/learn", "/learn/timetable", "/learn/tests", "/learn/tests/tt1"]) await test.step(path, () => scan(page, `/s/greenfield${path}`));
});
