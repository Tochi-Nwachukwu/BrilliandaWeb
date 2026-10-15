// Every request passes through here first (Next.js 16's proxy, formerly middleware).
// - <school>.brillianda.com/… shows that school's pages (/s/<school>/…), so each school has its own
//   address and its own cookies (plan: "Subdomain rules").
// - /api/* goes to the backend API with the headers it trusts (their docs/frontend-integration.md).
//   On staging (API_ROOT_DOMAIN set) schools have no subdomains, so /s/<school>/api/* names the
//   school in the path, and the API is told it came from <school>.<API_ROOT_DOMAIN>.
// - brillianda.com, localhost and Vercel preview addresses are served as they are, which keeps the
//   /s/<school>/… development addresses working.
// The rules themselves are in packages/core/src/hosts.ts, with tests.
import { apiAddress, apiCookieName } from "@brillianda/core/apiBridge";
import { rootDomains, routeFor } from "@brillianda/core/hosts";
import { NextResponse, type NextRequest } from "next/server";
import { LIVE } from "@/data/source";

const ROOTS = rootDomains(process.env.ROOT_DOMAIN);
/** Set only by this proxy: which school's address the request came in on. Pages and data may read it. */
const SCHOOL_HEADER = "x-brillianda-school";
const SECRET_HEADER = "x-brillianda-proxy-secret";
const API_ROOT = process.env.API_ROOT_DOMAIN?.trim().toLowerCase() || null;

/**
 * Sends a browser’s /api call on to the API: as from the school’s address, with the secret, and
 * with that school’s session (kept on our side under its own cookie names, src/data/api/client.ts).
 */
function toApi(request: NextRequest, headers: Headers, host: string, school: string | null, path: string) {
  const api = process.env.API_URL;
  const secret = process.env.API_PROXY_SECRET;
  if (!LIVE || !api || !secret) {
    return NextResponse.json({ error: { code: "api_unavailable", message: "The Brillianda API isn’t connected here yet." } }, { status: 503 });
  }
  // Writes only from our own pages.
  if (request.method !== "GET" && request.method !== "HEAD" && request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ code: "csrf_rejected", status: 403, title: "Not allowed from this page" }, { status: 403 });
  }
  const address = API_ROOT ? apiAddress(school, API_ROOT) : { host, proto: request.nextUrl.protocol.replace(":", ""), origin: request.nextUrl.origin };
  headers.set("x-forwarded-host", address.host);
  headers.set("x-forwarded-proto", address.proto);
  headers.set("x-forwarded-for", request.headers.get("x-forwarded-for") ?? "");
  if (request.method !== "GET" && request.method !== "HEAD") headers.set("origin", address.origin);
  headers.set(SECRET_HEADER, secret);
  const session = request.cookies
    .getAll()
    .map((c) => [apiCookieName(school, c.name), c.value] as const)
    .filter(([name]) => name)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  if (session) headers.set("cookie", session);
  else headers.delete("cookie");
  return NextResponse.rewrite(new URL(path + request.nextUrl.search, api), { request: { headers } });
}

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? request.nextUrl.host;
  const route = routeFor({ host, path: request.nextUrl.pathname, search: request.nextUrl.search, roots: ROOTS });

  // Never let a browser claim these.
  const headers = new Headers(request.headers);
  headers.delete(SCHOOL_HEADER);
  headers.delete(SECRET_HEADER);

  // Staging: a school’s API call from its /s/<school>/ pages (the logo, say).
  const scoped = API_ROOT ? /^\/s\/([a-z][a-z0-9-]*)\/api(\/.*)?$/.exec(request.nextUrl.pathname) : null;
  if (scoped) return toApi(request, headers, host, scoped[1]!, scoped[2] ?? "/");

  switch (route.kind) {
    case "api":
      return toApi(request, headers, host, route.school, route.path);
    case "redirect":
      // Built by hand: NextResponse.redirect shortens a URL on the server's own host to a bare path,
      // and on greenfield.localhost that path would loop back here.
      return new NextResponse(null, { status: 308, headers: { location: route.url } });
    case "not-found":
      // No such page here: Next's not-found page answers.
      return NextResponse.rewrite(new URL("/__not-found", request.url), { request: { headers } });
    case "school": {
      headers.set(SCHOOL_HEADER, route.school);
      const url = request.nextUrl.clone();
      url.pathname = route.path;
      return NextResponse.rewrite(url, { request: { headers } });
    }
    case "pass": {
      const school = /^\/s\/([^/]+)/.exec(request.nextUrl.pathname)?.[1];
      if (school && host.toLowerCase().startsWith(`${school}.`)) headers.set(SCHOOL_HEADER, school);
      return NextResponse.next({ request: { headers } });
    }
  }
}

export const config = {
  // Next's own build files never need the proxy.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
