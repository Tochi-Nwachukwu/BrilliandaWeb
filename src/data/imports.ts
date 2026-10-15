// Importing students (docs/data-contract.md). Screens import from here, never from fake/.
import "server-only";
import { LIVE } from "./api/client";
import * as live from "./api/imports";
import * as fake from "./fake/imports";
import type { ImportSetup } from "./types";

// The API where it has endpoints (DATA_SOURCE=api), else sample data.
const impl = LIVE ? live : fake;

/** The school's classes and arms, existing students (for duplicates), the remembered mapping and recent imports. */
export function getImportSetup(subdomain: string): Promise<ImportSetup | null> {
  return impl.getImportSetup(subdomain);
}
