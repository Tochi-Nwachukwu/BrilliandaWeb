import { PageSpinner } from "@brillianda/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { authLinkClass } from "@/components/auth/styles";
import { schoolFromParams } from "@/components/school/school";
import { signIn } from "@/data/actions/auth";
import { getCurrentMember } from "@/data/auth";
import { getSampleAccounts } from "@/data/samples";
import { SignInForm } from "./SignInForm";

export const metadata: Metadata = { title: "Sign in" };

export default function SchoolSignInPage({ params }: PageProps<"/s/[school]/login">) {
  return (
    <Suspense fallback={<PageSpinner fullScreen />}>
      <SignIn params={params} />
    </Suspense>
  );
}

async function SignIn({ params }: { params: Promise<{ school: string }> }) {
  const school = await schoolFromParams(params);
  if (await getCurrentMember(school.subdomain)) redirect(`/s/${school.subdomain}`);
  return (
    <AuthLayout
      school={school}
      title="Sign in"
      description={`Use the email ${school.name} added you with.`}
      footer={
        <>
          Rather not type a password?{" "}
          <Link href={`/s/${school.subdomain}/magic-link`} className={authLinkClass}>
            Email me a sign-in link
          </Link>
        </>
      }
    >
      <SignInForm school={school.subdomain} action={signIn.bind(null, school.subdomain)} samples={await getSampleAccounts(school.subdomain)} />
    </AuthLayout>
  );
}
