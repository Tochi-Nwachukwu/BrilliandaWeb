import { EmptyState } from "@brillianda/ui/EmptyState";
import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { BroadsheetTable } from "@/components/results/BroadsheetTable";
import { RemarksForm } from "@/components/results/RemarksForm";
import { saveRating, saveRemark } from "@/data/actions/reports";
import { getBroadsheet, getClassReports } from "@/data/reports";
import { getTeacherHome } from "@/data/teaching";

export const metadata: Metadata = { title: "My class" };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const pill = (on: boolean) =>
  `rounded-full px-4 py-2 text-sm font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent ${on ? "bg-primary text-primary-text" : "bg-raise shadow-raised hover:bg-hover"}`;

/** A form teacher's class this term: its broadsheet, and the remarks and ratings they write. */
export default async function MyClassPage({ params, searchParams }: PageProps<"/s/[school]/teach/class">) {
  const { school } = await params;
  const query = await searchParams;
  await connection();
  const home = await getTeacherHome(school);
  if (!home) return null;
  if (!home.formArms.length) {
    return (
      <>
        <PageHeader title="My class" />
        <div className="rounded-3xl bg-surface p-6 shadow-raised">
          <EmptyState title="No form class">Form teachers see their class’s results and write its remarks here.</EmptyState>
        </div>
      </>
    );
  }
  const asked = one(query.arm);
  const armId = home.formArms.some((a) => a.armId === asked) ? asked! : home.formArms[0]!.armId;
  const tab = one(query.tab) === "remarks" ? "remarks" : "broadsheet";
  const [sheet, reports] = await Promise.all([getBroadsheet(school, armId), getClassReports(school, armId)]);
  if (!sheet || !reports) return null;
  const base = `/s/${school}/teach/class?arm=${armId}`;

  return (
    <>
      <PageHeader title={`My class: ${sheet.armLabel}`}>
        {sheet.term.name}, {sheet.term.session}. {sheet.subjects.filter((s) => s.status === "complete").length} of {sheet.subjects.length} subjects complete
        {sheet.published ? "; published to parents." : "."}
      </PageHeader>
      {home.formArms.length > 1 && (
        <nav aria-label="Your form classes" className="mb-3 flex flex-wrap gap-2">
          {home.formArms.map((a) => (
            <Link key={a.armId} href={`/s/${school}/teach/class?arm=${a.armId}`} aria-current={a.armId === armId ? "page" : undefined} className={pill(a.armId === armId)}>
              {a.label}
            </Link>
          ))}
        </nav>
      )}
      <nav aria-label="My class" className="mb-4 flex flex-wrap gap-2">
        <Link href={base} aria-current={tab === "broadsheet" ? "page" : undefined} className={pill(tab === "broadsheet")}>
          Broadsheet
        </Link>
        <Link href={`${base}&tab=remarks`} aria-current={tab === "remarks" ? "page" : undefined} className={pill(tab === "remarks")}>
          Remarks
        </Link>
      </nav>
      {tab === "broadsheet" ? (
        <BroadsheetTable sheet={sheet} reportHref={(id) => `/s/${school}/teach/class/report/${id}`} />
      ) : (
        <RemarksForm reports={reports} saveRemark={saveRemark.bind(null, school, armId)} saveRating={saveRating.bind(null, school, armId)} />
      )}
    </>
  );
}
