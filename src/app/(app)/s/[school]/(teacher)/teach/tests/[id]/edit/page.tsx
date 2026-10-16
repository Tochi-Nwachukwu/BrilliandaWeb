import type { Metadata } from "next";
import { NewTestPage } from "@/components/cbt/pages";

export const metadata: Metadata = { title: "Change the draft" };

export default async function Page({ params }: PageProps<"/s/[school]/teach/tests/[id]/edit">) {
  const { school, id } = await params;
  return <NewTestPage school={school} base={`/s/${school}/teach/tests`} testId={id} />;
}
