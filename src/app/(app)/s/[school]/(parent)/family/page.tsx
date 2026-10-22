import { EmptyState } from "@brillianda/ui/EmptyState";
import { Icon } from "@brillianda/ui/Icon";
import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { requestCorrection } from "@/data/actions/corrections";
import { getParentHome } from "@/data/parents";
import { greeting } from "@/lib/time";
import { ChildView } from "./ChildView";
import { schoolBase } from "@/lib/schoolBase";

export const metadata: Metadata = { title: "My children" };

/** A parent's home: one child shows in full; several show as a list to pick from. */
export default async function FamilyPage({ params }: PageProps<"/s/[school]/family">) {
  const { school } = await params;
  const sb = await schoolBase(school);
  await connection();
  const home = await getParentHome(school);
  if (!home) return null;

  return (
    <div className="grid gap-4">
      <PageHeader title={`${greeting()}, ${home.fullName}`}>
        {home.children.length === 1 ? `${home.children[0]!.fullName.split(" ")[0]}’s class and attendance.` : "Your children at this school."}
      </PageHeader>
      {home.children.length === 0 ? (
        <div className="rounded-3xl bg-surface p-6 shadow-raised">
          <EmptyState title="No children linked yet">If this is wrong, ask the school to check the guardian on your child’s record.</EmptyState>
        </div>
      ) : home.children.length === 1 ? (
        <ChildView
          child={home.children[0]!}
          reportHref={`${sb}/family/${home.children[0]!.id}/report`}
          askCorrection={requestCorrection.bind(null, school, home.children[0]!.id)}
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {home.children.map((child) => (
            <li key={child.id}>
              <Link
                href={`${sb}/family/${child.id}`}
                className="flex items-center justify-between gap-3 rounded-3xl bg-surface p-5 shadow-raised hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span>
                  <b className="block text-[17px] font-semibold">{child.fullName}</b>
                  <span className="text-sm text-text-secondary">
                    {child.armLabel}
                    {child.attendance && child.attendance.days > 0 ? ` · present ${child.attendance.present} of ${child.attendance.days} days` : ""}
                  </span>
                </span>
                <Icon name="chevron" className="h-4 w-4 text-text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
