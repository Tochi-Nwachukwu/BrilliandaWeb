import type { Metadata } from "next";
import { NewTestPage } from "@/components/cbt/pages";

export const metadata: Metadata = { title: "Set a test" };

export default async function Page({ params }: PageProps<"/s/[school]/more/tests/new">) {
  const { school } = await params;
  return <NewTestPage school={school} base={`/s/${school}/more/tests`} />;
}
