import { Badge } from "@brillianda/ui/Badge";
import { Card } from "@brillianda/ui/Cards";
import { EmptyState } from "@brillianda/ui/EmptyState";
import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { getConsoleOverview } from "@/data/console";
import { plural, timeAgo } from "@/lib/time";

export const metadata: Metadata = { title: "Overview", robots: { index: false } };

const linkClass = "rounded-2xl focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent";

/** The team's start page: how many schools, what's waiting, and what happened lately. */
export default async function ConsoleOverviewPage() {
  await connection();
  const o = await getConsoleOverview();
  if (!o) return null;
  const now = new Date().getTime();
  const figures = [
    { label: "Active schools", value: o.schools.active, href: "/console/schools" },
    { label: "New this week", value: o.schools.newThisWeek, href: "/console/schools" },
    { label: "Students", value: o.students.toLocaleString(), href: "/console/schools" },
    { label: "Trial requests waiting", value: o.trialsWaiting, href: "/console/trials" },
  ];

  return (
    <div className="grid gap-4">
      <PageHeader title="Overview">
        {plural(o.schools.active, "school")} on Brillianda{o.schools.suspended ? `, ${o.schools.suspended} paused` : ""}.
      </PageHeader>

      <ul className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {figures.map((f) => (
          <li key={f.label}>
            <Link href={f.href} className={`${linkClass} grid gap-1 bg-surface p-[18px] shadow-raised hover:bg-hover`}>
              <span className="text-[13.5px] text-text-secondary">{f.label}</span>
              <span className="text-[30px] font-medium leading-none tracking-[-0.03em] tabular-nums">{f.value}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Newest schools">
          <ul className="grid gap-1">
            {o.recentSchools.map((s) => (
              <li key={s.subdomain}>
                <Link href={`/console/schools/${s.subdomain}`} className={`${linkClass} flex items-center justify-between gap-3 p-3 hover:bg-hover`}>
                  <span className="min-w-0">
                    <b className="block truncate font-semibold">{s.name}</b>
                    <span className="text-[13px] text-text-secondary">
                      {s.createdAt ? `Joined ${timeAgo(s.createdAt, now)}` : "Sample school"} · {plural(s.students, "student")}
                    </span>
                  </span>
                  {s.status === "suspended" && <Badge tone="warning">Paused</Badge>}
                </Link>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Recent activity" description="Signups, and what the team changed.">
          {o.activity.length ? (
            <ul className="grid gap-2">
              {o.activity.map((a, i) => (
                <li key={`${a.at}-${i}`} className="text-sm">
                  <b className="font-semibold">{a.who}</b> <span className="text-text-secondary">{a.what}</span>
                  <span className="block text-[12.5px] text-text-secondary">{timeAgo(a.at, now)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nothing yet">Signups and the team’s changes show here.</EmptyState>
          )}
        </Card>
      </div>
    </div>
  );
}
