// The rules for talking to the Brillianda API (their docs/frontend-integration.md), kept pure so
// they can be tested: which address a call claims to come from, how the API's cookies are kept on
// our side, and how its errors become the ActionResult screens already show.

/** An RFC 9457 problem document, as every API error is. */
export type Problem = {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  code: string;
  requestId?: string;
  errors?: { pointer?: string; parameter?: string; code?: string; detail: string }[];
  retryAfterSec?: number;
  [key: string]: unknown;
};

/**
 * The address a call claims to come from, in production: the school's real address
 * (`<school>.brillianda.com`), from which the API reads the school.
 */
export function apiAddress(school: string | null, root: string): { host: string; origin: string; proto: "http" | "https" } {
  const host = school ? `${school}.${root}` : root;
  const proto = root === "localhost" || root.startsWith("localhost:") ? "http" : "https";
  return { host, origin: `${proto}://${host}`, proto };
}

/**
 * Where a call goes, and the address it claims to come from. In production the API reads the
 * school from the host. Staging can't give every school a subdomain, so there the API names the
 * school in the path instead (`/s/<school>/v1/…`, the servers in its openapi.json) and every call
 * comes from the API's own domain.
 */
export function apiRequest(
  school: string | null,
  path: string,
  root: string,
  staging: boolean,
): { path: string; host: string; origin: string; proto: "http" | "https" } {
  if (!staging) return { path, ...apiAddress(school, root) };
  return { path: school ? `/s/${school}${path}` : path, ...apiAddress(null, root) };
}

/**
 * Our name for one of the API's cookies. The API pins its session to each school's address; our
 * pages for every school can share one address (localhost, staging), so each school's cookies
 * are kept apart under their own names and handed back only on that school's calls.
 */
export function keptCookieName(school: string | null, name: string): string {
  return `bda.${school ?? "main"}.${name}`;
}

/** The API's cookie name inside one of ours for this school, or null if it isn't this school's. */
export function apiCookieName(school: string | null, kept: string): string | null {
  const prefix = `bda.${school ?? "main"}.`;
  return kept.startsWith(prefix) && kept.length > prefix.length ? kept.slice(prefix.length) : null;
}

export type SetCookie = { name: string; value: string; maxAge?: number; expires?: Date; remove: boolean };

/** One Set-Cookie header, as far as we need it: name, value, and how long it lasts. */
export function parseSetCookie(header: string, now = Date.now()): SetCookie | null {
  const [pair, ...attrs] = header.split(";");
  const eq = pair?.indexOf("=") ?? -1;
  if (!pair || eq <= 0) return null;
  const name = pair.slice(0, eq).trim();
  const value = pair.slice(eq + 1).trim();
  const cookie: SetCookie = { name, value, remove: value === "" };
  for (const attr of attrs) {
    const [key = "", ...rest] = attr.split("=");
    const v = rest.join("=").trim();
    const k = key.trim().toLowerCase();
    if (k === "max-age" && /^-?\d+$/.test(v)) cookie.maxAge = Number(v);
    if (k === "expires") {
      const at = new Date(v);
      if (!Number.isNaN(at.getTime())) cookie.expires = at;
    }
  }
  if ((cookie.maxAge !== undefined && cookie.maxAge <= 0) || (cookie.expires && cookie.expires.getTime() <= now)) cookie.remove = true;
  return cookie;
}

/** `#/terms/1/startsOn` → `terms.1.startsOn`, the keys our forms use. */
export function fieldKey(pointer: string): string {
  return pointer.replace(/^#\/?/, "").split("/").map((p) => p.replace(/~1/g, "/").replace(/~0/g, "~")).join(".");
}

export type Failure = { ok: false; error: string; fieldErrors?: Record<string, string[]> };

/**
 * A problem as a failed ActionResult. `rename` maps the API's field names to the form's where they
 * differ (`name` → `schoolName`); the first part of the key is renamed, the rest kept.
 */
export function failureOf(problem: Problem, rename: Record<string, string> = {}): Failure {
  const fieldErrors: Record<string, string[]> = {};
  for (const e of problem.errors ?? []) {
    const raw = e.pointer ? fieldKey(e.pointer) : e.parameter;
    if (!raw) continue;
    const [head = "", ...rest] = raw.split(".");
    const key = [rename[head] ?? head, ...rest].join(".");
    (fieldErrors[key] ??= []).push(e.detail);
  }
  let error = problem.detail ?? problem.title ?? "Something went wrong. Try again.";
  if (problem.code === "validation_failed" && Object.keys(fieldErrors).length) error = "Please check the highlighted fields.";
  if (problem.code === "rate_limited") {
    const wait = Number(problem.retryAfterSec);
    error = wait > 0 ? `Too many tries. Wait ${wait < 90 ? `${wait} seconds` : `${Math.ceil(wait / 60)} minutes`} and try again.` : "Too many tries. Wait a moment and try again.";
  }
  if (problem.code === "internal" && problem.requestId) error = `Something went wrong on our side. Try again in a moment (reference ${problem.requestId.slice(0, 8)}).`;
  return Object.keys(fieldErrors).length ? { ok: false, error, fieldErrors } : { ok: false, error };
}

/** A problem for when the API can't be reached at all. */
export function unreachable(detail = "We can’t reach Brillianda right now. Check your connection and try again."): Problem {
  return { status: 503, code: "service_unavailable", title: "Service unavailable", detail };
}

/** ISO 8601 to milliseconds since 1970, which our shapes use. */
export function ms(iso: string): number {
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}
