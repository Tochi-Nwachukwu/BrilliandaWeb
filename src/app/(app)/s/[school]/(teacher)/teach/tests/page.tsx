import type { Metadata } from "next";
import { TestsListPage } from "@/components/cbt/pages";
import { schoolBase } from "@/lib/schoolBase";

export const metadata: Metadata = { title: "Tests" };

export default async function Page({ params }: PageProps<"/s/[school]/teach/tests">) {
  const { school } = await params;
  const sb = await schoolBase(school);
  return <TestsListPage school={school} base={`${sb}/teach/tests`} />;
}
