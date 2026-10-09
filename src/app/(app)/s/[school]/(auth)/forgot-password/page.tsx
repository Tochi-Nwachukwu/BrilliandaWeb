import { PageSpinner } from "@brillianda/ui/Spinner";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { EmailRequestForm } from "@/components/auth/forms";
import { authLinkClass } from "@/components/auth/styles";
import { schoolFromParams } from "@/components/school/school";
import { requestPasswordReset } from "@/data/actions/auth";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage({ params }: PageProps<"/s/[school]/forgot-password">) {
  return (
    <Suspense fallback={<PageSpinner fullScreen />}>
      <Forgot params={params} />
    </Suspense>
  );
}

async function Forgot({ params }: { params: Promise<{ school: string }> }) {
  const school = await schoolFromParams(params);
  return (
    <AuthLayout
      school={school}
      title="Reset your password"
      description="Enter the email you sign in with and we’ll send you a link to choose a new password."
      footer={
        <Link href={`/s/${school.subdomain}/login`} className={authLinkClass}>
          Back to sign in
        </Link>
      }
    >
      <EmailRequestForm
        action={requestPasswordReset.bind(null, school.subdomain)}
        submitLabel="Send reset link"
        pendingLabel="Sending…"
        sent={
          <>
            <p className="font-medium text-text-primary">If that email is on file, a reset link is on its way.</p>
            <p>The link works for 1 hour. Nothing arrived? Check your spam folder, or ask your school’s owner.</p>
          </>
        }
      />
    </AuthLayout>
  );
}
