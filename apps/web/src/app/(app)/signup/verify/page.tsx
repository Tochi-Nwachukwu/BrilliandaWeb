import { Badge, PageSpinner, Toaster } from "@brillianda/ui";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { getSignupDraft } from "@/data/signup";
import { SignupSteps } from "../SignupSteps";
import { VerifyForm } from "./VerifyForm";

export const metadata: Metadata = { title: "Check your email" };

export default function SignupVerifyPage() {
  return (
    <AuthLayout above={<SignupSteps current={3} />} title="Check your email" description={<Suspense><SentTo /></Suspense>}>
      <Suspense fallback={<PageSpinner />}>
        <VerifyStep />
      </Suspense>
      <Toaster />
    </AuthLayout>
  );
}

async function SentTo() {
  const draft = await getSignupDraft();
  return (
    <>
      <p>
        We sent a 6-digit code to <b className="font-medium text-text-primary">{draft?.owner?.email}</b>.
      </p>
      {/* FAKE: until real emails go out. */}
      <p>
        <Badge tone="warning">Sample data</Badge> No email is sent yet: any 6 digits work, except 000000.
      </p>
    </>
  );
}

async function VerifyStep() {
  const draft = await getSignupDraft();
  if (!draft?.school) redirect("/signup");
  if (!draft.owner || !draft.codeSentAt) redirect("/signup/account");
  if (draft.emailVerified) redirect("/signup/address");
  return <VerifyForm email={draft.owner.email} codeSentAt={draft.codeSentAt} />;
}
