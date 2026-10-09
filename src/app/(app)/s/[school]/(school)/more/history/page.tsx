import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import { connection } from "next/server";
import { listChanges } from "@/data/changes";
import { filterFrom } from "./filters";
import { HistoryView } from "./HistoryView";

export const metadata: Metadata = { title: "Change history" };

export default async function HistoryPage({ params, searchParams }: PageProps<"/s/[school]/more/history">) {
  const { school } = await params;
  const filter = filterFrom(await searchParams);
  await connection();
  const log = await listChanges(school, { ...filter, limit: filter.show });
  if (!log) return null;
  return (
    <div className="grid gap-4">
      <PageHeader title="Change history">Who changed what, and when, across the whole school. Nothing here can be edited or deleted, so it stays a true record.</PageHeader>
      <HistoryView school={school} log={log} filter={filter} now={new Date().getTime()} />
    </div>
  );
}
