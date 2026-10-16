import type { Metadata } from "next";
import { TestsListPage } from "@/components/cbt/pages";

export const metadata: Metadata = { title: "Tests" };

export default async function Page({ params }: PageProps<"/s/[school]/more/tests">) {
  const { school } = await params;
  return <TestsListPage school={school} base={`/s/${school}/more/tests`} />;
}
