import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import { connection } from "next/server";
import { saveResultsSettings } from "@/data/actions/results";
import { getResultsSettings } from "@/data/results";
import { ResultsSettingsForm } from "./ResultsSettingsForm";

export const metadata: Metadata = { title: "Results settings" };

export default async function ResultsSettingsPage({ params }: PageProps<"/s/[school]/more/results">) {
  const { school } = await params;
  await connection();
  const settings = await getResultsSettings(school);
  if (!settings) return null;
  return (
    <div className="grid gap-4">
      <PageHeader title="Results settings">What a score sheet is made of, how scores become grades, and whether report cards show positions.</PageHeader>
      <ResultsSettingsForm settings={settings} save={saveResultsSettings.bind(null, school)} />
    </div>
  );
}
