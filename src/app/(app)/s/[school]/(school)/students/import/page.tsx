import type { Metadata } from "next";
import { connection } from "next/server";
import { checkImport, commitImport, saveImportMapping, undoImport } from "@/data/actions/imports";
import { getImportSetup } from "@/data/imports";
import { listStudents } from "@/data/students";
import { ImportFlow } from "./ImportFlow";

export const metadata: Metadata = { title: "Import students" };

/** /students/import, or /students/import?arm=<id> from a class page for a per-class file. */
export default async function ImportPage({ params, searchParams }: PageProps<"/s/[school]/students/import">) {
  const { school } = await params;
  const { arm } = await searchParams;
  // Whether an import can still be undone depends on the time now.
  await connection();
  const [setup, list] = await Promise.all([getImportSetup(school), listStudents(school)]);
  if (!setup || !list) return null;
  const target = typeof arm === "string" ? list.arms.find((a) => a.id === arm) : undefined;
  return (
    <ImportFlow
      school={school}
      setup={setup}
      arm={target ? { id: target.id, label: target.label } : null}
      actions={{
        checkImport: checkImport.bind(null, school),
        commitImport: commitImport.bind(null, school),
        undoImport: undoImport.bind(null, school),
        saveImportMapping: saveImportMapping.bind(null, school),
      }}
    />
  );
}
