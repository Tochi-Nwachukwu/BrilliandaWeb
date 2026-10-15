// Subjects (docs/data-contract.md). Screens import from here, never from fake/.
import "server-only";
import { LIVE } from "./api/client";
import * as live from "./api/subjects";
import * as fake from "./fake/subjects";
import type { SubjectsSetup } from "./types";

// The API where it has endpoints (DATA_SOURCE=api), else sample data.
const impl = LIVE ? live : fake;

/** The school's subjects and their class links, its levels, the bands it runs, and the national catalogue. */
export function getSubjectsSetup(subdomain: string): Promise<SubjectsSetup | null> {
  return impl.getSubjectsSetup(subdomain);
}
