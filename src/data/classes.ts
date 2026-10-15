// Classes and arms (docs/data-contract.md). Screens import from here, never from fake/.
import "server-only";
import { LIVE } from "./api/client";
import * as live from "./api/classes";
import * as fake from "./fake/classes";
import type { ClassStructure } from "./types";

// The API where it has endpoints (DATA_SOURCE=api), else sample data.
const impl = LIVE ? live : fake;

/** The school's class levels, arm names and arms (with student counts). Null for non-members. */
export function getClassStructure(subdomain: string): Promise<ClassStructure | null> {
  return impl.getClassStructure(subdomain);
}
