import type { Metadata } from "next";
import { inviteAllParents, inviteParent, removeParentAccess } from "@/data/actions/parents";
import { getParentsPage } from "@/data/parents";
import { ParentsView } from "./ParentsView";

export const metadata: Metadata = { title: "Parents" };

export default async function ParentsPage({ params }: PageProps<"/s/[school]/more/parents">) {
  const { school } = await params;
  const page = await getParentsPage(school);
  if (!page) return null;
  return <ParentsView school={school} page={page} invite={inviteParent.bind(null, school)} inviteAll={inviteAllParents.bind(null, school)} remove={removeParentAccess.bind(null, school)} />;
}
