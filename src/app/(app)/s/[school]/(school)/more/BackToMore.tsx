"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Pages one step below More already link back somewhere else (Promotion goes back to Sessions);
// deeper pages (one test, a printed paper) link to their own list.
const OWN_BACK_LINK = new Set(["promotion"]);

/** "← More" at the top of each page opened from the More list. */
export function BackToMore({ moreHref }: { moreHref: string }) {
  const pathname = usePathname();
  if (!pathname.startsWith(`${moreHref}/`)) return null;
  const rest = pathname.slice(moreHref.length + 1);
  if (rest.includes("/") || OWN_BACK_LINK.has(rest)) return null;
  return (
    <Link
      href={moreHref}
      className="mb-3 inline-block rounded text-sm font-medium text-text-secondary hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
    >
      ← More
    </Link>
  );
}
