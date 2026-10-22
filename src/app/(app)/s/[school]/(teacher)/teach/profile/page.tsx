import type { Metadata } from "next";
import { ProfilePage } from "@/components/profile/ProfilePage";
import { schoolBase } from "@/lib/schoolBase";

export const metadata: Metadata = { title: "My profile" };

export default async function Profile({ params }: PageProps<"/s/[school]/teach/profile">) {
  const { school } = await params;
  const sb = await schoolBase(school);
  return <ProfilePage school={school} backHref={`${sb}/teach`} />;
}
