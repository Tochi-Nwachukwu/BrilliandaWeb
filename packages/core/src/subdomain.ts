// A school's address, like surebloom.brillianda.com (plan: "Subdomain rules"). The page checks
// these as the owner types and the server checks them again, so both give the same answer.

export const SUBDOMAIN_MIN = 3;
export const SUBDOMAIN_MAX = 30;

/** Names the platform needs, and names that would pass for an exam body or agency. */
export const RESERVED_SUBDOMAINS: ReadonlySet<string> = new Set([
  "www", "app", "api", "admin", "auth", "mail", "status", "help", "docs", "blog", "cdn", "staging",
  "waec", "neco", "jamb", "ubec",
]);

export type SubdomainProblem = { reason: "invalid" | "reserved"; message: string };

/** Lower case with the spaces taken out, which is how people expect an address to be typed. */
export function normaliseSubdomain(input: string): string {
  return input.trim().toLowerCase().replace(/\s+/g, "");
}

/**
 * Why a name can't be used, or null if it can (whether it is taken is the server's question).
 * 3 to 30 characters: lowercase letters, digits and single hyphens, starting with a letter and
 * not ending with a hyphen.
 */
export function subdomainProblem(name: string): SubdomainProblem | null {
  const invalid = (message: string): SubdomainProblem => ({ reason: "invalid", message });
  if (name.length < SUBDOMAIN_MIN) return invalid(`Use at least ${SUBDOMAIN_MIN} characters`);
  if (name.length > SUBDOMAIN_MAX) return invalid(`Use at most ${SUBDOMAIN_MAX} characters`);
  if (/[^a-z0-9-]/.test(name)) return invalid("Use only lowercase letters, numbers and hyphens");
  if (!/^[a-z]/.test(name)) return invalid("Start with a letter");
  if (name.endsWith("-")) return invalid("Don’t end with a hyphen");
  if (name.includes("--")) return invalid("Use one hyphen at a time");
  if (RESERVED_SUBDOMAINS.has(name)) return { reason: "reserved", message: "That name is kept for Brillianda" };
  return null;
}

// Words that describe any school, dropped for the shortest suggestion ("Surebloom School" → surebloom).
const GENERIC = new Set([
  "the", "school", "schools", "college", "academy", "international", "group", "of", "and",
  "nursery", "primary", "secondary", "high", "comprehensive", "model", "montessori",
]);

function words(schoolName: string): string[] {
  return schoolName
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, "")
    .split(/[\s-]+/)
    .filter(Boolean);
}

/**
 * Addresses to offer from the school's name, best first: "Surebloom School" gives surebloom,
 * surebloomschool and surebloom-school. Only valid, unreserved names are returned.
 */
export function suggestSubdomains(schoolName: string): string[] {
  const all = words(schoolName);
  const core = all.filter((w) => !GENERIC.has(w));
  const candidates = [
    core.join(""),
    all.join(""),
    all.join("-"),
    core.join("-"),
    // Initials for long names: "Royal Heights International College" → rhic.
    all.length >= 3 ? all.map((w) => w[0]).join("") : "",
  ];
  return unique(candidates.map((c) => c.slice(0, SUBDOMAIN_MAX).replace(/-+$/, "")).filter((c) => !subdomainProblem(c)));
}

/**
 * Other addresses to try when one is taken: the name with the school's state, with "school",
 * and with a number. The caller still checks each one is free.
 */
export function alternativeSubdomains(taken: string, state?: string): string[] {
  const base = taken.slice(0, SUBDOMAIN_MAX - 7).replace(/-+$/, "");
  const place = state ? words(state).join("") : "";
  const candidates = [place && `${base}-${place}`, place && `${base}${place}`, `${base}school`, `${base}-school`, `${base}2`, `${base}-2`];
  return unique(candidates.filter((c) => c && c !== taken && !subdomainProblem(c)));
}

function unique(list: string[]): string[] {
  return [...new Set(list)];
}
