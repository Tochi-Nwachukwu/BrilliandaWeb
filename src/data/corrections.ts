// Parents' correction requests (batch 21; docs/data-contract.md). Screens import from here, never from fake/.
import "server-only";
import * as impl from "./fake/corrections";
import { LIVE } from "./source";
import type { CorrectionsPage } from "./types";

/** More › Corrections: requests waiting, then the latest answered. Owners and admins. */
export function getCorrections(subdomain: string): Promise<CorrectionsPage | null> {
  return impl.getCorrections(subdomain);
}

/** How many are waiting, for the More tab. None on the API yet. */
export function countOpenCorrections(subdomain: string): Promise<number> {
  if (LIVE) return Promise.resolve(0);
  return impl.countOpenCorrections(subdomain);
}
