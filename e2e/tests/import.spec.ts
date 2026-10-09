import { expect, test, type Page } from "@playwright/test";
import JSZip from "jszip";
import { open } from "./helpers";

// Importing students (batch 9), into Greenfield (JSS 1 to SS 3; Blue, Gold and Green arms). Each
// screen size uses its own names and admission numbers, so the two runs never collide.

/**
 * Picks a file, again if needed: the import screen streams in just after the page's frame, and a
 * file picked before it is ready goes nowhere.
 */
async function pickFile(page: Page, file: { name: string; mimeType: string; buffer: Buffer }, next: ReturnType<Page["getByText"]>) {
  await expect(async () => {
    await page.locator('input[type="file"]').setInputFiles(file);
    await expect(next).toBeVisible({ timeout: 3000 });
  }).toPass({ timeout: 30_000 });
}

async function signIn(page: Page) {
  await open(page, "/s/greenfield/login");
  await page.getByLabel("Email").fill("owner@greenfield.ng");
  await page.getByLabel("Password", { exact: true }).fill("brillianda");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/s\/greenfield$/);
}

/** 0 → "a", 27 → "bb": names are letters only. */
const letters = (n: number) => {
  let s = "";
  for (let x = n + 1; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(97 + ((x - 1) % 26)) + s;
  return s;
};

const LEVELS = ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"];
const ARMS = ["Blue", "Gold", "Green"];

/**
 * A school's own list, in its own headings (Surname, Sex, Adm No…), with planted mistakes:
 * 10 rows in a class that doesn't exist (JSS 7), one unknown gender, one month-first date, one
 * repeated admission number, and one bad phone (flagged, not blocking).
 */
function plantedList(tag: string): string {
  const lines = ["Surname,First Name,Sex,Class,Arm,DOB,Adm No,Parent Phone"];
  for (let i = 0; i < 1000; i++) {
    let cls = LEVELS[i % 6]!;
    let sex = i % 2 ? "M" : "F";
    let dob = `${String((i % 27) + 1).padStart(2, "0")}/0${(i % 9) + 1}/2012`;
    let adm = `${tag}/${String(i + 1).padStart(5, "0")}`;
    let phone = `0803 ${String(1000000 + i).slice(1, 4)} ${String(1000000 + i).slice(-4)}`;
    if (i % 100 === 50) cls = "JSS 7";
    if (i === 5) sex = "X";
    if (i === 7) dob = "03/14/2012";
    if (i === 11) adm = `${tag}/00011`;
    if (i === 9) phone = "12345";
    lines.push([`Learner${tag}${letters(i)}`, `Pupil${letters(i)}`, sex, cls, ARMS[i % 3], dob, adm, phone].join(","));
  }
  return lines.join("\n");
}

test("a 1,000-row list with planted mistakes is fixed and imported (the plan's gate)", async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  const tag = testInfo.project.name === "phone" ? "Ph" : "Lp";
  await signIn(page);
  await open(page, "/s/greenfield/students/import");

  await pickFile(page, { name: "our-list.csv", mimeType: "text/csv", buffer: Buffer.from(plantedList(tag)) }, page.getByText("2. Match the columns"));
  // Headings map themselves: Surname, Sex and Adm No included.
  await expect(page.getByLabel("What “Surname” holds")).toHaveValue("lastName");
  await expect(page.getByLabel("What “Sex” holds")).toHaveValue("gender");
  await expect(page.getByLabel("What “Adm No” holds")).toHaveValue("admissionNo");
  await page.getByRole("button", { name: "Check 1,000 rows" }).click();

  // 13 rows need fixing; the bad phone is only a note.
  await expect(page.getByRole("button", { name: /Needs fixing\s*13/ })).toBeVisible();
  const rowsToFix = page.getByRole("list", { name: "Rows to fix" });
  await expect(rowsToFix.getByText("Dates are read day first. Did you mean 14/03/2012?")).toBeVisible();

  // Fix the unknown gender in place.
  await rowsToFix.getByRole("listitem").filter({ hasText: "isn’t a gender" }).getByRole("button", { name: "Fix" }).click();
  await page.getByLabel("Gender").locator("visible=true").fill("Female");
  await page.getByRole("button", { name: "Save the row" }).click();
  await expect(page.getByRole("button", { name: /Needs fixing\s*12/ })).toBeVisible();

  // A near match is only applied with a tap.
  await rowsToFix.getByRole("listitem").filter({ hasText: "Class JSS 7 not found" }).first().getByRole("button", { name: "Fix" }).click();
  await page.getByRole("button", { name: "Use JSS 1" }).click();
  await page.getByRole("button", { name: "Save the row" }).click();
  await expect(page.getByRole("button", { name: /Needs fixing\s*11/ })).toBeVisible();

  // The rest can go out as a file to fix in Excel.
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download the 11 rows to fix" }).click();
  expect((await download).suggestedFilename()).toBe("our-list-to-fix.csv");

  await page.getByRole("button", { name: "Import 989 students" }).click();
  await expect(page.getByText("989 added")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("11 still to fix")).toBeVisible();

  // Undo takes the whole import back.
  await page.getByRole("button", { name: "Undo this import" }).click();
  await expect(page.getByText("Removed 989 students from this import")).toBeVisible();
});

/** A small Word document with the students in a table, as many schools keep class lists. */
async function wordTable(tag: string): Promise<Buffer> {
  const cell = (text: string) => `<w:tc><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:tc>`;
  const row = (cells: string[]) => `<w:tr>${cells.map(cell).join("")}</w:tr>`;
  const body = [row(["Name", "Gender", "Class"]), row([`Amara Word${tag}`, "Female", "JSS 2 Gold"]), row([`Bayo Word${tag}`, "Male", "SS 1 Blue"])].join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>JSS list</w:t></w:r></w:p><w:tbl>${body}</w:tbl></w:body></w:document>`;
  const zip = new JSZip();
  zip.file("word/document.xml", xml);
  return zip.generateAsync({ type: "nodebuffer" });
}

test("a Word document's table imports like a spreadsheet, and an old .doc is explained", async ({ page }, testInfo) => {
  const tag = testInfo.project.name === "phone" ? "Ph" : "Lp";
  await signIn(page);
  await open(page, "/s/greenfield/students/import");
  await pickFile(page, { name: "jss-list.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: await wordTable(tag) }, page.getByText("2. Match the columns"));
  await expect(page.getByLabel("What “Name” holds")).toHaveValue("fullName");
  await page.getByRole("button", { name: "Check 2 rows" }).click();
  await expect(page.getByRole("button", { name: /Ready\s*2/ })).toBeVisible();
  await page.getByRole("button", { name: "Import 2 students" }).click();
  await expect(page.getByText("2 added")).toBeVisible();

  await page.getByRole("button", { name: "Import another file" }).click();
  await pickFile(page, { name: "list.doc", mimeType: "application/msword", buffer: Buffer.from("old") }, page.getByText("This is an old Word file (.doc)", { exact: false }));
});

test("the template downloads as Excel", async ({ page }) => {
  await signIn(page);
  await open(page, "/s/greenfield/students/import");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download the Excel template" }).click();
  expect((await download).suggestedFilename()).toBe("Greenfield-College-students-template.xlsx");
});
