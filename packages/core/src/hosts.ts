// Which school an address belongs to (plan: "Subdomain rules", each school at <school>.brillianda.com).
// proxy.ts asks this for every request; it's pure so it can be tested without a server.

/** What proxy.ts should do with a request. Paths are the app's own (/s/<school>/…). */
export type Route =
  /** Serve it as it is: the main site, a file, or a path that's already the app's own. */
  | { kind: "pass" }
  /** Show the school's page at this path. */
  | { kind: "school"; school: string; path: string }
  /** Send the browser elsewhere: www to the bare domain, signup to the main site. */
  | { kind: "redirect"; url: string }
  /** Forward to the backend API at this path (without /api). */
  | { kind: "api"; path: string; school: string | null }
  /** Not here: another school's pages on this school's address. */
  | { kind: "not-found" };

/** The domains schools live under. localhost works in development: greenfield.localhost:3000. */
export function rootDomains(configured: string | undefined): string[] {
  return [...new Set([(configured ?? "brillianda.com").trim().toLowerCase(), "localhost"].filter(Boolean))];
}

/** The school part of a host, or null for the main site and anything that isn't ours. */
export function schoolOfHost(host: string, roots: string[]): string | null {
  const name = host.trim().toLowerCase().replace(/:\d+$/, "").replace(/\.$/, "");
  for (const root of roots) {
    if (name === root || !name.endsWith(`.${root}`)) continue;
    const sub = name.slice(0, -(root.length + 1));
    // One level only, in the address rule's shape; anything else isn't a school address.
    if (/^[a-z][a-z0-9-]{1,29}$/.test(sub) && !sub.endsWith("-")) return sub;
    return null;
  }
  return null;
}

/** Files and app internals that are the same on every address. */
function isShared(path: string): boolean {
  if (path.startsWith("/_next/") || path === "/sw.js" || path === "/offline" || path === "/favicon.ico" || path === "/icon.svg") return true;
  // Anything with a file extension is a file in public/ (photos, images, robots.txt), except the
  // school's own manifest, which is a page.
  return /\/[^/]+\.[a-z0-9]+$/i.test(path) && path !== "/manifest.webmanifest";
}

/** Pages that live on the main site, never on a school's address. */
const MAIN_SITE_ONLY = /^\/(signup|dev|console)(\/|$)/;

export function routeFor({ host, path, search = "", roots }: { host: string; path: string; search?: string; roots: string[] }): Route {
  const school = schoolOfHost(host, roots);
  const bare = host.trim().toLowerCase().replace(/:\d+$/, "");
  const port = host.match(/:\d+$/)?.[0] ?? "";
  const protocol = roots.some((r) => r === "localhost" && (bare === "localhost" || bare.endsWith(".localhost"))) ? "http" : "https";

  if (path === "/api" || path.startsWith("/api/")) return { kind: "api", path: path.slice(4) || "/", school: school === "www" ? null : school };

  if (school === "www") {
    const root = bare.slice(4);
    return { kind: "redirect", url: `${protocol}://${root}${port}${path}${search}` };
  }
  if (!school) return { kind: "pass" };

  if (isShared(path)) return { kind: "pass" };
  if (MAIN_SITE_ONLY.test(path)) {
    const root = bare.slice(school.length + 1);
    return { kind: "redirect", url: `${protocol}://${root}${port}${path}${search}` };
  }
  // In-app links still use /s/<school>/… (the development addresses); they work on the school's
  // own address too. Another school's pages don't.
  if (path === "/s" || path.startsWith("/s/")) {
    const [, , owner] = path.split("/");
    return owner === school ? { kind: "pass" } : { kind: "not-found" };
  }
  return { kind: "school", school, path: `/s/${school}${path === "/" ? "" : path}` };
}
