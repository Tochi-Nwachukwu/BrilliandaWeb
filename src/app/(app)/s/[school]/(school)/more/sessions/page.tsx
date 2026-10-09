import { termPosition } from "@brillianda/core";
import { Alert, Badge, Card, PageHeader, cx } from "@brillianda/ui";
import type { Metadata } from "next";
import { connection } from "next/server";
import { saveSession } from "@/data/actions/home";
import { getSession } from "@/data/home";
import type { SessionSetup } from "@/data/types";
import { formatDate, todayInLagos } from "@/lib/time";
import { SessionForm } from "./SessionForm";

export const metadata: Metadata = { title: "Sessions and terms" };

export default async function SessionsPage({ params }: PageProps<"/s/[school]/more/sessions">) {
  const { school } = await params;
  // Which term is "now" depends on today.
  await connection();
  const session = await getSession(school);
  if (!session) return null;

  return (
    <div className="grid gap-4">
      <PageHeader title="Sessions and terms">Your school year and its terms. Everything you record sits in a term.</PageHeader>
      {!session.confirmed && (
        <Alert tone="info">These are suggested dates, from Lagos State’s school calendar. Check them against your own and save.</Alert>
      )}
      <Timeline session={session} today={todayInLagos()} />
      <SessionForm key={`${session.startYear}-${session.terms.map((t) => t.startsOn).join()}`} session={session} save={saveSession.bind(null, school)} />
    </div>
  );
}

/** The session's terms at a glance (from the old Session screen): which one is now, and its dates. */
function Timeline({ session, today }: { session: SessionSetup; today: string }) {
  const position = session.confirmed ? termPosition(session.terms, today) : null;
  const status = (i: number) =>
    position?.kind === "in-term" && position.index === i ? "now" : session.confirmed && session.terms[i]!.endsOn < today ? "done" : "later";
  return (
    <Card title={`${session.name} session`} description={`${session.terms.length} terms.${position?.kind === "break" ? " It’s the holiday now." : ""}`}>
      <ol className={cx("grid gap-2", session.terms.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {session.terms.map((term, i) => (
          <li key={term.name} className={cx("grid gap-1.5 rounded-2xl p-3.5", status(i) === "now" ? "bg-accent-soft" : "bg-sunken")} aria-current={status(i) === "now" ? "step" : undefined}>
            <span className="flex items-center justify-between gap-2">
              <b className="text-[15px] font-semibold">{term.name}</b>
              <Badge tone={status(i) === "now" ? "info" : status(i) === "done" ? "success" : "neutral"}>
                {status(i) === "now" && position?.kind === "in-term" ? `Now, week ${position.week}` : status(i) === "done" ? "Done" : `Term ${i + 1}`}
              </Badge>
            </span>
            <span className="text-[13px] text-text-secondary">
              {formatDate(term.startsOn)} to {formatDate(term.endsOn)}
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
