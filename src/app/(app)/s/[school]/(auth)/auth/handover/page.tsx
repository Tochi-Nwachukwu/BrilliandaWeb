import { PageSpinner } from "@brillianda/ui/Spinner";
import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { schoolFromParams } from "@/components/school/school";
import { completeHandover } from "@/data/actions/auth";
import { OpenSchool } from "./OpenSchool";

export const metadata: Metadata = { title: "Opening your school" };

// Where signup lands on the new school's own address (the API's handoverUrl): a sign-in on
// brillianda.com doesn't carry over to <school>.brillianda.com, so a one-time pass signs the owner in.
export default function HandoverPage({ params, searchParams }: PageProps<"/s/[school]/auth/handover">) {
  return (
    <Suspense fallback={<PageSpinner fullScreen />}>
      <Handover params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Handover({ params, searchParams }: { params: Promise<{ school: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const school = await schoolFromParams(params);
  const raw = (await searchParams).token;
  const token = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  return (
    <AuthLayout school={school} title={`Opening ${school.name}`} description="Signing you in to your new school.">
      <OpenSchool action={completeHandover.bind(null, school.subdomain, token)} homeHref={`/s/${school.subdomain}`} loginHref={`/s/${school.subdomain}/login`} />
    </AuthLayout>
  );
}
