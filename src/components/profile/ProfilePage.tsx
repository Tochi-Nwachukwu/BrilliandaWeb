// The My profile page each dashboard mounts at its own address (/profile, /teach/profile,
// /family/profile, /learn/profile), so it keeps that dashboard's sidebar.
import { connection } from "next/server";
import { changePassword, setPhoto, updateProfile } from "@/data/actions/profile";
import { getMyProfile } from "@/data/profile";
import { getSchoolBySubdomain } from "@/data/school";
import { ProfileView } from "./ProfileView";

export async function ProfilePage({ school, backHref }: { school: string; backHref: string }) {
  await connection();
  const [profile, place] = await Promise.all([getMyProfile(school), getSchoolBySubdomain(school)]);
  if (!profile || !place) return null;
  return (
    <ProfileView
      profile={profile}
      schoolName={place.name}
      backHref={backHref}
      save={updateProfile.bind(null, school)}
      savePhoto={setPhoto.bind(null, school)}
      changePassword={changePassword.bind(null, school)}
    />
  );
}
