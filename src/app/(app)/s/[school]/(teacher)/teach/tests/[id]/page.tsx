import type { Metadata } from "next";
import { TestPage } from "@/components/cbt/pages";
import { schoolBase } from "@/lib/schoolBase";

export const metadata: Metadata = { title: "Test" };

export default async function Page({ params }: PageProps<"/s/[school]/teach/tests/[id]">) {
  const { school, id } = await params;
  const sb = await schoolBase(school);
  return <TestPage school={school} base={`${sb}/teach/tests`} testId={id} />;
}
