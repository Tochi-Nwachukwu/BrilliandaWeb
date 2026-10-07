// Builds the marketing site and the app and puts them in one folder, so both deploy as a single
// Vercel project on one address (DECISIONS.md D-17). Run with `npm run build:vercel`.
//
//   /                  the site (apps/site)
//   anything else      the app (apps/web), whose index.html becomes app.html; vercel.json sends
//                      every path that isn't a real file to it, and the app's router takes over.
//
// The app is built as a demo (VITE_DEMO=true) while there is no API; set VITE_DEMO=false in the
// Vercel project to build it for real. Both builds put hashed files in /assets, so names can't
// collide; any other clash stops the build rather than letting one app overwrite the other's file.

import { execSync } from "node:child_process";
import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const site = join(root, "apps/site/dist");
const web = join(root, "apps/web/dist");
const out = join(root, "dist");

/** Every file under `dir`, as paths relative to `base`. */
async function files(dir, base = dir) {
  const found = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await files(path, base)));
    else found.push(relative(base, path));
  }
  return found;
}

const run = (command, env = {}) => execSync(command, { cwd: root, stdio: "inherit", env: { ...process.env, ...env } });
run("npm run build -w apps/site");
run("npm run build -w apps/web", { VITE_DEMO: process.env.VITE_DEMO ?? "true" });

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(site, out, { recursive: true });

const clashes = [];
for (const file of await files(web)) {
  const target = join(out, file === "index.html" ? "app.html" : file);
  const exists = await stat(target).then(() => true, () => false);
  if (exists) clashes.push(file);
  else {
    await mkdir(dirname(target), { recursive: true });
    await cp(join(web, file), target);
  }
}

if (clashes.length) {
  console.error(`build-for-vercel: the site and the app both have ${clashes.join(", ")}. Rename one.`);
  process.exit(1);
}
console.log(`build-for-vercel: site and app combined in ${relative(root, out)}/`);
