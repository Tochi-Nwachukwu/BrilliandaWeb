import { PageSpinner } from "@brillianda/ui/Spinner";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { LinkSignIn } from "@/components/auth/flows";
import { authLinkClass } from "@/components/auth/styles";
import { schoolFromParams } from "@/components/school/school";
import { signInWithLink } from "@/data/actions/auth";

export const metadata: Metadata = { title: "Sign in" };

export default function MagicSignInPage({ params }: PageProps<"/s/[school]/magic/[token]">) {
  return (
    <Suspense fallback={<PageSpinner fullScreen />}>
      <MagicSignIn params={params} />
    </Suspense>
  );
}

async function MagicSignIn({ params }: { params: Promise<{ school: string; token: string }> }) {
  const school = await schoolFromParams(params);
  const { token } = await params;
  return (
    <AuthLayout
      school={school}
      title={`Sign in to ${school.name}`}
      description="Press the button to finish signing in. The link works once."
      footer={
        <Link href={`/s/${school.subdomain}/magic-link`} className={authLinkClass}>
          Send a new link
        </Link>
      }
    >
      <LinkSignIn action={signInWithLink.bind(null, school.subdomain, token)} homeHref={`/s/${school.subdomain}`} />
    </AuthLayout>
  );
}
