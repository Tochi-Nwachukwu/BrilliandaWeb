import { PageSpinner } from "@brillianda/ui/Spinner";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { teamSignIn } from "@/data/actions/console";
import { getTeamMember } from "@/data/console";
import { TeamSignInForm } from "./TeamSignInForm";

export const metadata: Metadata = { title: "Team sign-in", robots: { index: false } };

/** The Brillianda team's own sign-in. School accounts don't work here, and team accounts don't work in a school. */
export default function TeamLogin() {
  return (
    <Suspense fallback={<PageSpinner fullScreen />}>
      <TeamLoginPage />
    </Suspense>
  );
}

async function TeamLoginPage() {
  // Already signed in: straight to the console.
  if (await getTeamMember()) redirect("/console");
  return (
    <AuthLayout title="Brillianda team" description="For the Brillianda team only, with a team account. Your school account won’t work here: schools sign in at their own address.">
      <TeamSignInForm action={teamSignIn} />
    </AuthLayout>
  );
}
