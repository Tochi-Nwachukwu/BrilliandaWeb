// The school a page belongs to (docs/data-contract.md). Screens import from here, never from fake/.
import "server-only";
import * as impl from "./fake/school";
import type { SchoolSummary } from "./types";

/**
 * The school at a subdomain, or null if there isn't one. Suspended and archived schools are
 * returned with their status, so the page can say so instead of "not found".
 */
export function getSchoolBySubdomain(subdomain: string): Promise<SchoolSummary | null> {
  return impl.getSchoolBySubdomain(subdomain);
}
