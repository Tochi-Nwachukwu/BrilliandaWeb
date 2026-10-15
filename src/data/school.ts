// The school a page belongs to (docs/data-contract.md). Screens import from here, never from fake/.
import "server-only";
import { LIVE } from "./api/client";
import * as live from "./api/school";
import * as fake from "./fake/school";
import type { SchoolSummary } from "./types";

// The API where it has endpoints (DATA_SOURCE=api), else sample data.
const impl = LIVE ? live : fake;

/**
 * The school at a subdomain, or null if there isn't one. Suspended and archived schools are
 * returned with their status, so the page can say so instead of "not found".
 */
export function getSchoolBySubdomain(subdomain: string): Promise<SchoolSummary | null> {
  return impl.getSchoolBySubdomain(subdomain);
}
