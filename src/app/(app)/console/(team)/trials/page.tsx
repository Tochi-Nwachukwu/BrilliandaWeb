import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import { connection } from "next/server";
import { setTrialStatus } from "@/data/actions/console";
import { listTrialRequests } from "@/data/console";
import { TrialsView } from "./TrialsView";

export const metadata: Metadata = { title: "Trial requests", robots: { index: false } };

export default async function ConsoleTrials() {
  await connection();
  const requests = await listTrialRequests();
  if (!requests) return null;
  return (
    <>
      <PageHeader title="Trial requests">From the form on brillianda.com. Mark each one as you follow it up.</PageHeader>
      <TrialsView requests={requests} now={new Date().getTime()} save={setTrialStatus} />
    </>
  );
}
