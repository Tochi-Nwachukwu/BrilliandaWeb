import { PageSpinner } from "@brillianda/ui/Spinner";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { authLinkClass } from "@/components/auth/styles";
import { schoolFromParams } from "@/components/school/school";
import { ROLE_LABEL } from "@brillianda/core/auth";
import { Button } from "@brillianda/ui/Button";
import { signIn, signOut } from "@/data/actions/auth";
import { getCurrentMember } from "@/data/auth";
import { getSampleAccounts } from "@/data/samples";
import { SignInForm } from "./SignInForm";
import { schoolBase } from "@/lib/schoolBase";

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
  const sb = await schoolBase(school.subdomain);
  // Already signed in: say as whom, rather than quietly sending them on. Someone sharing a phone
  // (or trying another account) can sign out from here.
  const me = await getCurrentMember(school.subdomain);
  if (me) {
    return (
      <AuthLayout school={school} title="You’re already signed in" description={`As ${me.fullName}, ${ROLE_LABEL[me.role].toLowerCase()} at ${school.name}.`}>
        <div className="grid gap-3">
          <Link
            href={sb || "/"}
            className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-primary px-5 font-medium text-primary-text hover:bg-primary-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          >
            Continue as {me.fullName.split(" ")[0]}
          </Link>
          <form action={signOut.bind(null, school.subdomain)}>
            <Button type="submit" variant="secondary" size="lg" className="w-full">
              Sign out and use another account
            </Button>
          </form>
        </div>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout
      school={school}
      title="Sign in"
      description={`Use the email ${school.name} added you with.`}
      footer={
        <>
          Rather not type a password?{" "}
          <Link href={`${sb}/magic-link`} className={authLinkClass}>
            Email me a sign-in link
          </Link>
        </>
      }
    >
      <SignInForm school={school.subdomain} action={signIn.bind(null, school.subdomain)} samples={await getSampleAccounts(school.subdomain)} />
    </AuthLayout>
  );
}
