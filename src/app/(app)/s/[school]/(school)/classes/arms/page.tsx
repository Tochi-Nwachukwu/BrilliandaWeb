import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { saveArmLayout } from "@/data/actions/classes";
import { getClassStructure } from "@/data/classes";
import { ArmsEditor } from "./ArmsEditor";

export const metadata: Metadata = { title: "Edit arms" };

export default async function EditArmsPage({ params }: PageProps<"/s/[school]/classes/arms">) {
  const { school } = await params;
  const structure = await getClassStructure(school);
  if (!structure) return null;
  // Arms come after classes: until the quick setup is done, there's nothing to edit.
  if (!structure.levels.length) redirect(`/s/${school}/classes`);
  return <ArmsEditor school={school} structure={structure} save={saveArmLayout.bind(null, school)} />;
}
