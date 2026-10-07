import { PageSpinner } from "@brillianda/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { EmailRequestForm } from "@/components/auth/forms";
import { authLinkClass } from "@/components/auth/styles";
import { schoolFromParams } from "@/components/school/school";
import { sendMagicLink } from "@/data/actions/auth";

export const metadata: Metadata = { title: "Email me a sign-in link" };

export default function MagicLinkPage({ params }: PageProps<"/s/[school]/magic-link">) {
  return (
    <Suspense fallback={<PageSpinner fullScreen />}>
      <MagicLink params={params} />
    </Suspense>
  );
}

async function MagicLink({ params }: { params: Promise<{ school: string }> }) {
  const school = await schoolFromParams(params);
  return (
    <AuthLayout
      school={school}
      title="Sign in with a link"
      description="We’ll email you a link that signs you in once, no password needed."
      footer={
        <Link href={`/s/${school.subdomain}/login`} className={authLinkClass}>
          Sign in with a password instead
        </Link>
      }
    >
      <EmailRequestForm
        action={sendMagicLink.bind(null, school.subdomain)}
        submitLabel="Email me a link"
        pendingLabel="Sending…"
        sent={
          <>
            <p className="font-medium text-text-primary">If that email is on file, a sign-in link is on its way.</p>
            <p>Open it on this device. It works once, for 1 hour.</p>
          </>
        }
      />
    </AuthLayout>
  );
}
