import { defaultSessionStart } from "@brillianda/core/signup";
import { Alert } from "@brillianda/ui/Alert";
import { PageSpinner } from "@brillianda/ui/Spinner";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AuthLayout, authLinkClass } from "@/components/auth/AuthLayout";
import { getSignupDraft } from "@/data/signup";
import { SchoolForm } from "./SchoolForm";
import { SignupSteps } from "./SignupSteps";

export const metadata: Metadata = { title: "Create your school" };

const STEP_PATH = { school: "/signup", owner: "/signup/account", verify: "/signup/verify", address: "/signup/address" } as const;

export default function SignupSchoolPage() {
  return (
    <AuthLayout
      above={<SignupSteps current={1} />}
      title="Create your school"
      description="Four short steps. Your school gets its own address, like greenfield.brillianda.com."
      footer={
        <>
          Already on Brillianda?{" "}
          <Link href="/login" className={authLinkClass}>
            Find your school
          </Link>
        </>
      }
    >
      <Suspense fallback={<PageSpinner />}>
        <SchoolStep />
      </Suspense>
    </AuthLayout>
  );
}

async function SchoolStep() {
  const draft = await getSignupDraft();
  // Today decides the default session, so this part is worked out per request.
  await connection();
  const further = draft && draft.step !== "school";
  return (
    <>
      {further && (
        <div className="mb-6">
          <Alert tone="info" action={<Link href={STEP_PATH[draft.step]} className={authLinkClass}>Continue</Link>}>
            You’ve started already. Pick up where you stopped, or change your school’s details here.
          </Alert>
        </div>
      )}
      <SchoolForm saved={draft?.school ?? null} defaultStart={defaultSessionStart(new Date())} />
    </>
  );
}
