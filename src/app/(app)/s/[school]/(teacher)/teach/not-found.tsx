"use client";

import { EmptyState } from "@brillianda/ui/EmptyState";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** A class this teacher doesn't teach (or that's gone). */
export default function ClassNotFound() {
  // Back to this area's start, on /s/<school>/… or on the school's own address alike.
  const path = usePathname();
  const back = path.slice(0, path.indexOf("/teach") + "/teach".length);
  return (
    <div className="grid gap-4">
      <div className="rounded-3xl bg-surface p-6 shadow-raised">
        <EmptyState title="This page isn’t here">It may be an old link, or a class you don’t teach any more.</EmptyState>
      </div>
      <Link href={back} className="w-fit rounded text-sm font-medium text-accent hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
        Back to today
      </Link>
    </div>
  );
}
