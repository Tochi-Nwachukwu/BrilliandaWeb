// Classes and arms (docs/data-contract.md). Screens import from here, never from fake/.
import "server-only";
import * as impl from "./fake/classes";
import type { ClassStructure } from "./types";

/** The school's class levels, arm names and arms (with student counts). Null for non-members. */
export function getClassStructure(subdomain: string): Promise<ClassStructure | null> {
  return impl.getClassStructure(subdomain);
}
