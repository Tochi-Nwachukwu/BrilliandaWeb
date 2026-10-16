import type { Metadata } from "next";
import { TestPage } from "@/components/cbt/pages";

export const metadata: Metadata = { title: "Test" };

export default async function Page({ params }: PageProps<"/s/[school]/more/tests/[id]">) {
  const { school, id } = await params;
  return <TestPage school={school} base={`/s/${school}/more/tests`} testId={id} />;
}
