// Starts the landing site and the app together, in one terminal: `npm run dev`.
// Output from each is prefixed so you can tell them apart. Ctrl+C stops both, and if one
// crashes the other is stopped too, so you never end up with half the pair running.

import { spawn, spawnSync } from "node:child_process";

const SERVERS = [
  { name: "site", script: "dev:site", colour: "\x1b[33m", url: "http://localhost:5174/" },
  { name: "app ", script: "dev:web", colour: "\x1b[36m", url: "http://localhost:5173/login" },
];
const RESET = "\x1b[0m";

console.log("\nStarting Brillanda:");
for (const server of SERVERS) console.log(`  ${server.colour}${server.name}${RESET}  ${server.url}`);
console.log("Press Ctrl+C to stop both.\n");

let stopping = false;
const children = SERVERS.map((server) => {
  const child = spawn("npm", ["run", server.script], { shell: true, stdio: ["ignore", "pipe", "pipe"] });
  const prefix = `${server.colour}[${server.name}]${RESET} `;
  const relay = (stream) => (chunk) => {
    for (const line of chunk.toString().split(/\r?\n/)) if (line.trim()) stream.write(prefix + line + "\n");
  };
  child.stdout.on("data", relay(process.stdout));
  child.stderr.on("data", relay(process.stderr));
  child.on("exit", (code) => {
    if (stopping) return;
    console.log(`${prefix}stopped (exit ${code}). Stopping the other one too.`);
    stopAll(code ?? 1);
  });
  return child;
});

function stopAll(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode !== null) continue;
    // On Windows the npm shell starts Vite as a grandchild; only a tree kill reaches it.
    if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    else child.kill("SIGTERM");
  }
  process.exit(code);
}

process.on("SIGINT", () => stopAll(0));
process.on("SIGTERM", () => stopAll(0));
