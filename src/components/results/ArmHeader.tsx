import { Badge } from "@brillianda/ui/Badge";
import { PageHeader } from "@brillianda/ui/PageHeader";
import Link from "next/link";
import { setPublished } from "@/data/actions/reports";
import type { Broadsheet } from "@/data/types";
import { PublishButton } from "./PublishButton";

/** A class's results header for admins: term, publish state, and its three tabs. */
export function ArmHeader({ school, sheet, tab }: { school: string; sheet: Broadsheet; tab: "subjects" | "broadsheet" | "remarks" }) {
  const base = `/s/${school}/results/${sheet.armId}`;
  const tabs = [
    { id: "subjects", label: "Subjects", href: base },
    { id: "broadsheet", label: "Broadsheet", href: `${base}/broadsheet` },
    { id: "remarks", label: "Remarks", href: `${base}/remarks` },
  ] as const;
  const done = sheet.subjects.filter((s) => s.status === "complete").length;
  return (
    <>
      <Link href={`/s/${school}/results`} className="mb-3 inline-block rounded text-sm font-medium text-text-secondary hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
        ← Results
      </Link>
      <PageHeader
        title={sheet.armLabel}
        actions={sheet.canPublish && <PublishButton label={sheet.armLabel} published={!!sheet.published} ready={sheet.allComplete} setPublished={setPublished.bind(null, school, sheet.armId)} />}
      >
        <span className="flex flex-wrap items-center gap-2">
          {sheet.term.name}, {sheet.term.session}. {done} of {sheet.subjects.length} subjects complete.
          {sheet.published ? <Badge tone="success">Published</Badge> : <Badge>Not published</Badge>}
        </span>
      </PageHeader>
      <nav aria-label={`${sheet.armLabel} results`} className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={t.href}
            aria-current={t.id === tab ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent ${t.id === tab ? "bg-primary text-primary-text" : "bg-raise shadow-raised hover:bg-hover"}`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
