// Calls to the Brillianda API from our server (Server Components and Server Actions). Browsers
// never call it directly. The rules are in packages/core/src/apiBridge.ts, with tests.
//
// Settings (.env.example):
// - DATA_SOURCE=api switches the screens that have endpoints onto the API. Anything else keeps
//   every screen on sample data, as the browser tests do.
// - API_URL and API_PROXY_SECRET: where the API runs, and the secret it trusts us with.
// - API_ROOT_DOMAIN: staging only, the API's own domain. Its presence means staging: schools are
//   named in the path (/s/<school>/v1/…) rather than the host.
import "server-only";
import { apiCookieName, apiRequest, failureOf, keptCookieName, parseSetCookie, unreachable, type Failure, type Problem } from "@brillianda/core/apiBridge";
import { cookies, headers } from "next/headers";

export { LIVE } from "../source";

export type ApiResult<T> = { ok: true; status: number; data: T } | { ok: false; status: number; problem: Problem };

type Options = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Sent as JSON. */
  body?: unknown;
  /** Sent as multipart, e.g. a logo upload. */
  form?: FormData;
  query?: Record<string, string | number | undefined | null>;
};

function root(): string {
  return (process.env.API_ROOT_DOMAIN ?? process.env.ROOT_DOMAIN ?? "brillianda.com").split(",")[0]!.trim().toLowerCase();
}

/** Where a call goes and where it claims to come from: a school, or the main site when `school` is null. */
function requestFor(school: string | null, path: string) {
  return apiRequest(school, path, root(), Boolean(process.env.API_ROOT_DOMAIN?.trim()));
}

/**
 * Calls the API as if from `school`'s address (null: the main site), with the person's session for
 * that school. Cookies the API sets are kept on our side for that school only.
 */
export async function api<T>(school: string | null, path: string, { method = "GET", body, form, query }: Options = {}): Promise<ApiResult<T>> {
  const base = process.env.API_URL;
  const secret = process.env.API_PROXY_SECRET;
  if (!base || !secret) return { ok: false, status: 503, problem: unreachable("Brillianda isn’t connected here yet.") };

  const { path: target, host, origin, proto } = requestFor(school, path);
  const url = new URL(target, base);
  for (const [key, value] of Object.entries(query ?? {})) if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));

  const jar = await cookies();
  const sent = jar
    .getAll()
    .map((c) => [apiCookieName(school, c.name), c.value] as const)
    .filter(([name]) => name)
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
  const incoming = await headers();
  const sendHeaders: Record<string, string> = {
    accept: "application/json",
    "x-brillianda-proxy-secret": secret,
    "x-forwarded-host": host,
    "x-forwarded-proto": proto,
    "x-forwarded-for": incoming.get("x-forwarded-for") ?? "",
  };
  if (method !== "GET") sendHeaders.origin = origin;
  if (sent) sendHeaders.cookie = sent;
  if (body !== undefined) sendHeaders["content-type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(url, { method, headers: sendHeaders, body: form ?? (body !== undefined ? JSON.stringify(body) : undefined), cache: "no-store", redirect: "manual" });
  } catch {
    return { ok: false, status: 503, problem: unreachable() };
  }

  await keepCookies(school, res, incoming.get("x-forwarded-proto") === "https" || !/^(localhost|127\.)/.test(incoming.get("host") ?? ""));

  if (res.status === 204) return { ok: true, status: 204, data: undefined as T };
  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (res.ok) return { ok: true, status: res.status, data: json as T };
  const problem = json && typeof json === "object" && "code" in json ? (json as Problem) : unreachable();
  return { ok: false, status: res.status, problem: { ...problem, status: res.status } };
}

/** Keeps the API's cookies under this school's names. Reading a page can't set cookies; that's fine, the next action will. */
async function keepCookies(school: string | null, res: Response, secure: boolean) {
  const set = res.headers.getSetCookie?.() ?? [];
  if (!set.length) return;
  const jar = await cookies();
  for (const header of set) {
    const cookie = parseSetCookie(header);
    if (!cookie) continue;
    const name = keptCookieName(school, cookie.name);
    try {
      if (cookie.remove) jar.delete(name);
      else jar.set({ name, value: cookie.value, httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: cookie.maxAge, expires: cookie.expires });
    } catch {
      // A Server Component render: cookies are read-only there.
    }
  }
}

/** Forgets this school's session on our side (after signing out, or when the API says it's gone). */
export async function dropCookies(school: string | null) {
  const jar = await cookies();
  for (const c of jar.getAll()) {
    if (apiCookieName(school, c.name)) {
      try {
        jar.delete(c.name);
      } catch {
        // Read-only during a render.
      }
    }
  }
}

/** A failed call as a failed ActionResult. */
export function fail(result: { problem: Problem }, rename?: Record<string, string>): Failure {
  return failureOf(result.problem, rename);
}

/** The data of a read, or null when it failed (not signed in, not found, unreachable). */
export async function read<T>(school: string | null, path: string, query?: Options["query"]): Promise<T | null> {
  const result = await api<T>(school, path, { query });
  return result.ok ? result.data : null;
}
