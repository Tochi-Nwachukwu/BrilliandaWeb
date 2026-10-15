// Birthday messages (batch 19; docs/data-contract.md). Screens import from here, never from fake/.
import "server-only";
import * as impl from "./fake/birthdays";
import { LIVE } from "./source";
import type { BirthdaysPage, BirthdaysThisWeek } from "./types";

/** More › Birthdays: the school's message, the next 30 days' birthdays, and the texts sent. Owners and admins. */
export function getBirthdays(subdomain: string): Promise<BirthdaysPage | null> {
  return impl.getBirthdays(subdomain);
}

/** Home's card: birthdays in the next 7 days. Not on the API yet, so Home leaves it out there. */
export function getBirthdaysThisWeek(subdomain: string): Promise<BirthdaysThisWeek | null> {
  if (LIVE) return Promise.resolve(null);
  return impl.getBirthdaysThisWeek(subdomain);
}
