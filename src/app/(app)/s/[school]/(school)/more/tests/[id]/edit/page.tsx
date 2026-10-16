import type { Metadata } from "next";
import { NewTestPage } from "@/components/cbt/pages";

export const metadata: Metadata = { title: "Change the draft" };

export default async function Page({ params }: PageProps<"/s/[school]/more/tests/[id]/edit">) {
  const { school, id } = await params;
  return <NewTestPage school={school} base={`/s/${school}/more/tests`} testId={id} />;
}
