import { suggestSubdomains } from "@brillianda/core";
import { PageSpinner } from "@brillianda/ui";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { getSignupDraft } from "@/data/signup";
import { SignupSteps } from "../SignupSteps";
import { AddressForm } from "./AddressForm";

export const metadata: Metadata = { title: "Your school’s address" };

export default function SignupAddressPage() {
  return (
    <AuthLayout
      above={<SignupSteps current={4} />}
      title="Your school’s address"
      description="Your staff will sign in here. Pick something short that parents would recognise."
    >
      <Suspense fallback={<PageSpinner />}>
        <AddressStep />
      </Suspense>
    </AuthLayout>
  );
}

async function AddressStep() {
  const draft = await getSignupDraft();
  if (!draft?.school) redirect("/signup");
  if (!draft.owner) redirect("/signup/account");
  if (!draft.emailVerified) redirect("/signup/verify");
  return <AddressForm suggestions={suggestSubdomains(draft.school.schoolName)} state={draft.school.state} />;
}
