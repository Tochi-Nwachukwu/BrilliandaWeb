import type { Metadata } from "next";
import { NewTestPage } from "@/components/cbt/pages";
import { schoolBase } from "@/lib/schoolBase";

export const metadata: Metadata = { title: "Set a test" };

export default async function Page({ params }: PageProps<"/s/[school]/more/tests/new">) {
  const { school } = await params;
  const sb = await schoolBase(school);
  return <NewTestPage school={school} base={`${sb}/more/tests`} />;
}
