// Running the school year (group 3; docs/data-contract.md). Screens import from here, never from fake/.
import "server-only";
import * as promotion from "./fake/promotion";
import * as impl from "./fake/schoolyear";
import type { TermStatusData } from "./types";

/** The term open for results, unpublished classes, and closed terms. Owners and admins. */
export function getTermStatus(subdomain: string): Promise<TermStatusData | null> {
  return impl.getTermStatus(subdomain);
}

/** Promotion at the end of the session: each student's yearly average, suggestion and decision. */
export function getPromotionPlan(subdomain: string): Promise<import("./types").PromotionPlan | null> {
  return promotion.getPromotionPlan(subdomain);
}
