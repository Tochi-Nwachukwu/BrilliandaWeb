// Parents' correction requests (batch 21; docs/data-contract.md). Screens import from here, never from fake/.
import "server-only";
import * as live from "./api/corrections";
import * as fake from "./fake/corrections";
import { LIVE } from "./source";
import type { CorrectionsPage } from "./types";

// The API where it has endpoints (DATA_SOURCE=api), else sample data.
const impl = LIVE ? live : fake;

/** More › Corrections: requests waiting, then the latest answered. Owners and admins. */
export function getCorrections(subdomain: string): Promise<CorrectionsPage | null> {
  return impl.getCorrections(subdomain);
}

/** How many are waiting, for the More tab. None on the API yet. */
export function countOpenCorrections(subdomain: string): Promise<number> {
  return impl.countOpenCorrections(subdomain);
}
