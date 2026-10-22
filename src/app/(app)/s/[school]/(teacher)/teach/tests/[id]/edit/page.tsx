import type { Metadata } from "next";
import { NewTestPage } from "@/components/cbt/pages";
import { schoolBase } from "@/lib/schoolBase";

export const metadata: Metadata = { title: "Change the draft" };

export default async function Page({ params }: PageProps<"/s/[school]/teach/tests/[id]/edit">) {
  const { school, id } = await params;
  const sb = await schoolBase(school);
  return <NewTestPage school={school} base={`${sb}/teach/tests`} testId={id} />;
}
