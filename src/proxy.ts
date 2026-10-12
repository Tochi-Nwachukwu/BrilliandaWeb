// Every request passes through here first (Next.js 16's proxy, formerly middleware).
// - <school>.brillianda.com/… shows that school's pages (/s/<school>/…), so each school has its own
//   address and its own cookies (plan: "Subdomain rules").
// - /api/* goes to the backend API with the headers it trusts (their docs/frontend-integration.md).
// - brillianda.com, localhost and Vercel preview addresses are served as they are, which keeps the
//   /s/<school>/… development addresses working.
// The rules themselves are in packages/core/src/hosts.ts, with tests.
import { rootDomains, routeFor } from "@brillianda/core/hosts";
import { NextResponse, type NextRequest } from "next/server";

const ROOTS = rootDomains(process.env.ROOT_DOMAIN);
/** Set only by this proxy: which school's address the request came in on. Pages and data may read it. */
const SCHOOL_HEADER = "x-brillianda-school";
const SECRET_HEADER = "x-brillianda-proxy-secret";

export function proxy(request: NextRequest) {
  const host = request.headers.get("host") ?? request.nextUrl.host;
  const route = routeFor({ host, path: request.nextUrl.pathname, search: request.nextUrl.search, roots: ROOTS });

  // Never let a browser claim these.
  const headers = new Headers(request.headers);
  headers.delete(SCHOOL_HEADER);
  headers.delete(SECRET_HEADER);

  switch (route.kind) {
    case "api": {
      const api = process.env.API_URL;
      const secret = process.env.API_PROXY_SECRET;
      if (!api || !secret) {
        return NextResponse.json({ error: { code: "api_unavailable", message: "The Brillianda API isn’t connected here yet." } }, { status: 503 });
      }
      headers.set("x-forwarded-host", host);
      headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));
      headers.set("x-forwarded-for", request.headers.get("x-forwarded-for") ?? "");
      headers.set(SECRET_HEADER, secret);
      return NextResponse.rewrite(new URL(route.path + request.nextUrl.search, api), { request: { headers } });
    }
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
