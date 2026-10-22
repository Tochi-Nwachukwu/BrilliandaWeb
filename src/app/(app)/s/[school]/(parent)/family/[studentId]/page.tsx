import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { requestCorrection } from "@/data/actions/corrections";
import { getParentHome } from "@/data/parents";
import { ChildView } from "../ChildView";
import { schoolBase } from "@/lib/schoolBase";

export const metadata: Metadata = { title: "Child" };

/** One of a parent's children. Another family's child isn't found, whatever the address says. */
export default async function ChildPage({ params }: PageProps<"/s/[school]/family/[studentId]">) {
  const { school, studentId } = await params;
  const sb = await schoolBase(school);
  await connection();
  const home = await getParentHome(school);
  const child = home?.children.find((c) => c.id === studentId);
  if (!child) notFound();
  return (
    <div className="grid gap-4">
      <Link href={`${sb}/family`} className="w-fit rounded text-sm font-medium text-text-secondary hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
        ← My children
      </Link>
      <ChildView child={child} reportHref={`${sb}/family/${child.id}/report`} askCorrection={requestCorrection.bind(null, school, child.id)} />
    </div>
  );
}
