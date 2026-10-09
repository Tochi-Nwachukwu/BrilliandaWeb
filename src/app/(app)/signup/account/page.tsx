import { PageSpinner } from "@brillianda/ui/Spinner";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { getSignupDraft } from "@/data/signup";
import { SignupSteps } from "../SignupSteps";
import { OwnerForm } from "./OwnerForm";

export const metadata: Metadata = { title: "Your account" };

export default function SignupAccountPage() {
  return (
    <AuthLayout above={<SignupSteps current={2} />} title="Your account" description="You’ll own the school on Brillianda and can invite other admins later.">
      <Suspense fallback={<PageSpinner />}>
        <AccountStep />
      </Suspense>
    </AuthLayout>
  );
}

async function AccountStep() {
  const draft = await getSignupDraft();
  if (!draft?.school) redirect("/signup");
  return <OwnerForm saved={draft.owner} />;
}
