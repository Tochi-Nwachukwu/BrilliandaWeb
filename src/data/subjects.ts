// Subjects (docs/data-contract.md). Screens import from here, never from fake/.
import "server-only";
import * as impl from "./fake/subjects";
import type { SubjectsSetup } from "./types";

/** The school's subjects and their class links, its levels, the bands it runs, and the national catalogue. */
export function getSubjectsSetup(subdomain: string): Promise<SubjectsSetup | null> {
  return impl.getSubjectsSetup(subdomain);
}
