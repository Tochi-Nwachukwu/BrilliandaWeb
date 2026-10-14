"use client";

import { EmptyState } from "@brillianda/ui/EmptyState";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** A child who isn't this parent's (or no longer at the school). Says so without saying whose. */
export default function ChildNotFound() {
  // Back to this area's start, on /s/<school>/… or on the school's own address alike.
  const path = usePathname();
  const back = path.slice(0, path.indexOf("/family") + "/family".length);
  return (
    <div className="grid gap-4">
      <div className="rounded-3xl bg-surface p-6 shadow-raised">
        <EmptyState title="This page isn’t here">It may be an old link, or a child who isn’t linked to your account.</EmptyState>
      </div>
      <Link href={back} className="w-fit rounded text-sm font-medium text-accent hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
        Back to my children
      </Link>
    </div>
  );
}
