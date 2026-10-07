// Runs after `vite build`.
//
// Two jobs:
//   1. Keep the page light. Schools open this on phone data (NFR-11), so the JavaScript and CSS
//      have a budget and the build says what it spent.
//   2. Stop sample content reaching the public site. Testimonials, the phone number and the ₦
//      prices are marked `data-placeholder` (DECISIONS.md D-10). A release build refuses while any
//      of them remain; an ordinary build only warns, so the site can be worked on with them in.
//
// Release build:  BRILLANDA_RELEASE=1 npm run build -w apps/site

import { readFile, readdir, stat } from "node:fs/promises";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

const BUDGET = { js: 20 * 1024, css: 22 * 1024 }; // gzipped

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(path)));
    else out.push(path);
  }
  return out;
}

const files = await walk(dist);
const failures = [];

// ---- weight ----
const spent = { js: 0, css: 0 };
for (const file of files) {
  const ext = extname(file);
  if (ext !== ".js" && ext !== ".css") continue;
  const gz = gzipSync(await readFile(file)).length;
  spent[ext === ".js" ? "js" : "css"] += gz;
}

for (const kind of ["js", "css"]) {
  const line = `${kind.toUpperCase()} ${kb(spent[kind])} gzipped of ${kb(BUDGET[kind])}`;
  if (spent[kind] > BUDGET[kind]) failures.push(`over budget: ${line}`);
  else console.log(`  ok   ${line}`);
}

const images = files.filter((f) => [".webp", ".jpg", ".png", ".avif"].includes(extname(f)));
let imageBytes = 0;
for (const image of images) imageBytes += (await stat(image)).size;
console.log(`  ok   ${images.length} images, ${kb(imageBytes)} on disk (loaded as needed)`);

// ---- sample content ----
const html = await Promise.all(
  files.filter((f) => extname(f) === ".html").map(async (f) => [f, await readFile(f, "utf8")]),
);
const placeholders = html.flatMap(([file, text]) => {
  const count = (text.match(/data-placeholder/g) ?? []).length;
  return count ? [`${file.replace(dist, "dist")}: ${count}`] : [];
});

// ---- the trial form must have somewhere real to post ----
if (!process.env.VITE_API_URL) {
  const detail = "VITE_API_URL is not set, so a trial request would only be kept in the visitor's browser";
  if (process.env.BRILLANDA_RELEASE === "1") failures.push(detail);
  else console.log(`  note ${detail}. A release build will refuse this.`);
} else {
  console.log("  ok   trial form posts to a real API");
}

if (placeholders.length) {
  const detail = `sample content still in the page (data-placeholder) — ${placeholders.join(", ")}`;
  if (process.env.BRILLANDA_RELEASE === "1") failures.push(detail);
  else console.log(`  note ${detail}. A release build (BRILLANDA_RELEASE=1) will refuse this.`);
} else {
  console.log("  ok   no sample content left in the page");
}

if (failures.length) {
  console.error("\nBuild check failed:");
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log("\nBuild check passed.");
