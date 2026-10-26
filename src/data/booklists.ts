// Books and things needed (batch 20; docs/data-contract.md). Screens import from here, never from fake/.
import "server-only";
import * as live from "./api/booklists";
import * as fake from "./fake/booklists";
import { LIVE } from "./source";
import type { BookListsPage } from "./types";

// The API where it has endpoints (DATA_SOURCE=api), else sample data.
const impl = LIVE ? live : fake;

/** More › Book lists: every class level's list for this session or the next (the default). Owners and admins. */
export function getBookLists(subdomain: string, startYear?: number): Promise<BookListsPage | null> {
  return impl.getBookLists(subdomain, startYear);
}
