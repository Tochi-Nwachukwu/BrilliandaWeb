import type { Metadata } from "next";
import { ProfilePage } from "@/components/profile/ProfilePage";

export const metadata: Metadata = { title: "My profile" };

export default async function Profile({ params }: PageProps<"/s/[school]/family/profile">) {
  const { school } = await params;
  return <ProfilePage school={school} backHref={`/s/${school}/family`} />;
}
