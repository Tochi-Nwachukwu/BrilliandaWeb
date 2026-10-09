import { PageSpinner } from "@brillianda/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { ResetPasswordFlow } from "@/components/auth/flows";
import { authLinkClass } from "@/components/auth/styles";
import { schoolFromParams } from "@/components/school/school";
import { resetPassword } from "@/data/actions/auth";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage({ params }: PageProps<"/s/[school]/reset-password/[token]">) {
  return (
    <Suspense fallback={<PageSpinner fullScreen />}>
      <Reset params={params} />
    </Suspense>
  );
}

async function Reset({ params }: { params: Promise<{ school: string; token: string }> }) {
  const school = await schoolFromParams(params);
  const { token } = await params;
  const signInHref = `/s/${school.subdomain}/login`;
  return (
    <AuthLayout
      school={school}
      title="Choose a new password"
      footer={
        <Link href={signInHref} className={authLinkClass}>
          Back to sign in
        </Link>
      }
    >
      <ResetPasswordFlow action={resetPassword.bind(null, school.subdomain, token)} signInHref={signInHref} />
    </AuthLayout>
  );
}
