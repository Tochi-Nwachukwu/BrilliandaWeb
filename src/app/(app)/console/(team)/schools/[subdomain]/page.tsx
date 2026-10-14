import { Badge } from "@brillianda/ui/Badge";
import { Card, ProgressBar } from "@brillianda/ui/Cards";
import { Icon } from "@brillianda/ui/Icon";
import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { setSchoolStatus } from "@/data/actions/console";
import { getConsoleSchool } from "@/data/console";
import { displayNigerianPhone } from "@brillianda/core/nigeria";
import { timeAgo } from "@/lib/time";
import { StatusPanel } from "./StatusPanel";

export const metadata: Metadata = { title: "School", robots: { index: false } };

/** One school's summary for the team: contacts, counts, setup and status. No student's own record. */
export default async function ConsoleSchoolPage({ params }: PageProps<"/console/schools/[subdomain]">) {
  const { subdomain } = await params;
  await connection();
  const s = await getConsoleSchool(subdomain);
  if (!s) notFound();
  const now = new Date().getTime();
  const counts = [
    ["Students", s.students],
    ["Classes", s.classes],
    ["Subjects", s.subjects],
    ["Admins", s.admins],
    ["Teachers", s.teachers],
    ["Parents on the app", s.parents],
  ] as const;

  return (
    <div className="grid gap-4">
      <Link href="/console/schools" className="w-fit rounded text-sm font-medium text-text-secondary hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
        ← Schools
      </Link>
      <PageHeader title={s.name}>
        <span className="flex flex-wrap items-center gap-2">
          {s.subdomain}.brillianda.com
          {s.status === "suspended" ? <Badge tone="warning">Paused</Badge> : <Badge tone="success">Active</Badge>}
        </span>
      </PageHeader>

      <p className="flex items-start gap-2 rounded-2xl bg-accent-soft px-4 py-3 text-sm">
        <Icon name="activity" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        This visit is recorded in {s.name}’s change history, so the school can see that the Brillianda team looked.
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Contact">
          <dl className="grid gap-3 text-sm">
            <div>
              <dt className="text-[12.5px] text-text-secondary">Owner</dt>
              <dd className="font-medium">
                {s.owner ? (
                  <>
                    {s.owner.fullName} ·{" "}
                    <a href={`mailto:${s.owner.email}`} className="text-accent underline underline-offset-2">
                      {s.owner.email}
                    </a>
                  </>
                ) : (
                  "No owner"
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[12.5px] text-text-secondary">School phone</dt>
              <dd className="font-medium">{s.phone ? displayNigerianPhone(s.phone) : "Not given"}</dd>
            </div>
            <div>
              <dt className="text-[12.5px] text-text-secondary">State, and levels offered</dt>
              <dd className="font-medium">
                {s.state ?? "Not given"}
                {s.levelsOffered.length ? ` · ${s.levelsOffered.map((l) => l.charAt(0) + l.slice(1).toLowerCase()).join(", ")}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-[12.5px] text-text-secondary">Joined</dt>
              <dd className="font-medium">{s.createdAt ? timeAgo(s.createdAt, now) : "Sample school"}</dd>
            </div>
          </dl>
        </Card>

        <Card title="Size">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {counts.map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-sunken p-3">
                <dt className="text-[12.5px] text-text-secondary">{label}</dt>
                <dd className="text-[22px] font-medium tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card title="Setup" description={`${s.setupDone} of ${s.setupTotal} steps done.`}>
          <ProgressBar value={s.setupDone / s.setupTotal} />
          <ul className="mt-4 grid grid-cols-2 gap-2 text-sm">
            {s.setup.map((step) => (
              <li key={step.label} className="flex items-center gap-2">
                <span aria-hidden className={`grid h-5 w-5 place-items-center rounded-full ${step.done ? "bg-success-bg text-success" : "bg-sunken text-text-secondary"}`}>
                  {step.done ? <Icon name="check" className="h-3 w-3" /> : null}
                </span>
                {step.label}
                <span className="sr-only">{step.done ? "(done)" : "(not yet)"}</span>
              </li>
            ))}
          </ul>
        </Card>

        <StatusPanel school={s.name} status={s.status} note={s.statusNote} now={now} save={setSchoolStatus.bind(null, s.subdomain)} />
      </div>
    </div>
  );
}
