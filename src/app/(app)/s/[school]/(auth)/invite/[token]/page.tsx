import { INVITE_LIFETIME_HOURS } from "@brillianda/core/auth";
import { PageSpinner } from "@brillianda/ui/Spinner";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AcceptInviteFlow } from "@/components/auth/flows";
import { authLinkClass } from "@/components/auth/styles";
import { schoolFromParams } from "@/components/school/school";
import { acceptInvite } from "@/data/actions/auth";
import { getInvite } from "@/data/auth";

export const metadata: Metadata = { title: "Join your school" };

export default function AcceptInvitePage({ params }: PageProps<"/s/[school]/invite/[token]">) {
  return (
    <Suspense fallback={<PageSpinner fullScreen />}>
      <Accept params={params} />
    </Suspense>
  );
}

async function Accept({ params }: { params: Promise<{ school: string; token: string }> }) {
  const school = await schoolFromParams(params);
  const { token } = await params;
  // Whether an invite has expired depends on the time now, so this part is worked out per request.
  await connection();
  const invite = await getInvite(school.subdomain, token);
  const signIn = (
    <Link href={`/s/${school.subdomain}/login`} className={authLinkClass}>
      Go to sign in
    </Link>
  );

  if (!invite || invite.status !== "open") {
    // Nothing on this screen can fix it; only the owner can send a new invite.
    return (
      <AuthLayout
        school={school}
        title="This invite can’t be used"
        description={
          <>
            <p>{invite?.status === "used" ? "It has already been used to join." : invite?.status === "expired" ? "It has expired." : "The link isn’t right. It may have been cancelled."}</p>
            <p>Invite links work once and for {INVITE_LIFETIME_HOURS} hours. Ask the school’s owner to send a new one.</p>
          </>
        }
        footer={signIn}
      />
    );
  }

  const firstName = invite.fullName.split(" ")[0];
  return (
    <AuthLayout
      school={school}
      title={`Join ${school.name}`}
      description={
        <p>
          Hi {firstName}, you’ve been invited as a school admin. {invite.hasAccount ? "Enter your password to join." : "Choose a password to finish setting up your account."}
          <br />
          <span className="text-text-muted">{invite.email}</span>
        </p>
      }
    >
      <AcceptInviteFlow action={acceptInvite.bind(null, school.subdomain, token)} homeHref={`/s/${school.subdomain}`} hasAccount={invite.hasAccount} />
    </AuthLayout>
  );
}
