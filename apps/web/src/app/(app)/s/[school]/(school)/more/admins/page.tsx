import type { Metadata } from "next";
import { cancelInvite, inviteAdmin, removeAdmin } from "@/data/actions/members";
import { getCurrentMember } from "@/data/auth";
import { listMembers } from "@/data/members";
import { AdminsList } from "./AdminsList";

export const metadata: Metadata = { title: "Admins" };

export default async function AdminsPage({ params }: PageProps<"/s/[school]/more/admins">) {
  const { school } = await params;
  const [me, members] = await Promise.all([getCurrentMember(school), listMembers(school)]);
  return (
    <AdminsList
      members={members}
      meId={me?.userId ?? ""}
      isOwner={me?.role === "owner"}
      invite={inviteAdmin.bind(null, school)}
      cancel={cancelInvite.bind(null, school)}
      remove={removeAdmin.bind(null, school)}
    />
  );
}
