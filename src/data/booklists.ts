// Books and things needed (batch 20; docs/data-contract.md). Screens import from here, never from fake/.
import "server-only";
import * as impl from "./fake/booklists";
import type { BookListsPage } from "./types";

/** More › Book lists: every class level's list for this session or the next (the default). Owners and admins. */
export function getBookLists(subdomain: string, startYear?: number): Promise<BookListsPage | null> {
  return impl.getBookLists(subdomain, startYear);
}
