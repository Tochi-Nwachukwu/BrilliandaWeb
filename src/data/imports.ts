// Importing students (docs/data-contract.md). Screens import from here, never from fake/.
import "server-only";
import * as impl from "./fake/imports";
import type { ImportSetup } from "./types";

/** The school's classes and arms, existing students (for duplicates), the remembered mapping and recent imports. */
export function getImportSetup(subdomain: string): Promise<ImportSetup | null> {
  return impl.getImportSetup(subdomain);
}
