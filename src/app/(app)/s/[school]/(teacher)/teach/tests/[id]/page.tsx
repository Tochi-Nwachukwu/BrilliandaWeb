import type { Metadata } from "next";
import { TestPage } from "@/components/cbt/pages";

export const metadata: Metadata = { title: "Test" };

export default async function Page({ params }: PageProps<"/s/[school]/teach/tests/[id]">) {
  const { school, id } = await params;
  return <TestPage school={school} base={`/s/${school}/teach/tests`} testId={id} />;
}
