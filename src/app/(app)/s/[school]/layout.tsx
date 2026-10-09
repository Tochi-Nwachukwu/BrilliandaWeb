import { PageSpinner } from "@brillianda/ui/Spinner";
import type { Metadata } from "next";
import { Suspense } from "react";
import { BrandStyle } from "@/components/school/SchoolBrand";
import { SchoolClosed } from "@/components/school/SchoolClosed";
import { schoolFromParams } from "@/components/school/school";

// Every page on a school's address. In production proxy.ts maps surebloom.brillianda.com here;
// in development open /s/surebloom directly. Unknown schools 404 (s/not-found.tsx); suspended
// and archived ones show a closed page instead of their pages.
/** Each school is its own installable app: its manifest and its home-screen icon. */
export async function generateMetadata({ params }: LayoutProps<"/s/[school]">): Promise<Metadata> {
  const { school } = await params;
  const base = `/s/${school}`;
  return {
    manifest: `${base}/manifest.webmanifest`,
    icons: { apple: [{ url: `${base}/app-icon/180`, sizes: "180x180" }] },
    appleWebApp: { capable: true, statusBarStyle: "default" },
  };
}

export default function SchoolLayout({ children, params }: LayoutProps<"/s/[school]">) {
  return (
    <Suspense fallback={<PageSpinner fullScreen />}>
      <SchoolGate params={params}>{children}</SchoolGate>
    </Suspense>
  );
}

async function SchoolGate({ params, children }: { params: Promise<{ school: string }>; children: React.ReactNode }) {
  const school = await schoolFromParams(params);
  if (school.status !== "active") return <SchoolClosed school={school} />;
  return (
    <>
      <BrandStyle color={school.brandColor} />
      {children}
    </>
  );
}
