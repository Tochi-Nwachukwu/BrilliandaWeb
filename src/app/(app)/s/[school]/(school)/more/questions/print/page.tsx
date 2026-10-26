import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import { connection } from "next/server";
import { PaperBuilder } from "@/components/papers/PaperBuilder";
import { schoolFromParams } from "@/components/school/school";
import { getQuestionBank } from "@/data/questions";

export const metadata: Metadata = { title: "Print a paper" };

export default async function PrintPaperPage({ params }: PageProps<"/s/[school]/more/questions/print">) {
  const { school: subdomain } = await params;
  await connection();
  const [school, page] = await Promise.all([schoolFromParams(params), getQuestionBank(subdomain)]);
  if (!page) return null;
  return (
    <div className="grid gap-4">
      <div className="print:hidden">
        <PageHeader title="Print a paper">A test, assignment or exam from the question bank, on the school’s letterhead, with an answer key.</PageHeader>
      </div>
      <PaperBuilder page={page} schoolName={school.name} />
    </div>
  );
}
