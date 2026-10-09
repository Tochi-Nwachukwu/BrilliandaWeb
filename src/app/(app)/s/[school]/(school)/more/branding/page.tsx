import { PageHeader } from "@brillianda/ui/PageHeader";
import type { Metadata } from "next";
import { removeLogo, updateBranding, uploadLogo } from "@/data/actions/school";
import { getCurrentMember } from "@/data/auth";
import { getSchoolBySubdomain } from "@/data/school";
import { BrandingForm } from "./BrandingForm";

export const metadata: Metadata = { title: "Branding" };

export default async function BrandingPage({ params }: PageProps<"/s/[school]/more/branding">) {
  const { school } = await params;
  const [me, found] = await Promise.all([getCurrentMember(school), getSchoolBySubdomain(school)]);
  if (!found) return null;
  return (
    <div className="grid gap-4">
      <PageHeader title="Branding">Your school’s name, colour and logo, on the sign-in page, the header and the app icon. Brillianda shows only as a small “Powered by” link.</PageHeader>
      <BrandingForm
        school={found}
        isOwner={me?.role === "owner"}
        save={updateBranding.bind(null, school)}
        upload={uploadLogo.bind(null, school)}
        remove={removeLogo.bind(null, school)}
      />
    </div>
  );
}
