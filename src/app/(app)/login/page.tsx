import { Icon } from "@brillianda/ui/Icon";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { EmailRequestForm } from "@/components/auth/forms";
import { authLinkClass } from "@/components/auth/styles";
import { SchoolMark } from "@/components/school/SchoolBrand";
import { findMySchool } from "@/data/actions/auth";
import { getMySchools } from "@/data/auth";
import { ROOT_DOMAIN as ROOT } from "@/lib/domain";
import { MainSignIn } from "./MainSignIn";

export const metadata: Metadata = { title: "Sign in" };

// brillianda.com/login (plan: "Signing in later"). Sign in with the school's address, email and
// password (the form posts to the school's own address, where sessions live). Find your school is a
// line underneath, for people who don't know the address.
export default function FindMySchoolPage() {
  return (
    <AuthLayout
      title="Sign in"
      description="Your school’s address, then the email and password your school added you with."
      footer={
        <>
          New to Brillianda?{" "}
          <Link href="/signup" className={authLinkClass}>
            Create your school
          </Link>
        </>
      }
    >
      <Suspense>
        <YourSchools />
      </Suspense>
      <MainSignIn
        root={ROOT}
        findSchool={
          <div className="grid gap-3">
            <p className="font-medium text-text-primary">Find your school</p>
            <p>We’ll email a link to each school that uses your email.</p>
            <EmailRequestForm
              action={findMySchool}
              submitLabel="Email me my schools"
              pendingLabel="Sending…"
              sent={
                <>
                  <p className="font-medium text-text-primary">If that email has a school, we’ve sent it a link to each one.</p>
                  <p>No email within a few minutes (spam folder included) means there’s no school under that address. Try the email your school has for you, or ask your school.</p>
                </>
              }
            />
          </div>
        }
      />
    </AuthLayout>
  );
}

/** The school picker, for someone already signed in, especially with more than one school. */
async function YourSchools() {
  const schools = await getMySchools();
  if (!schools.length) return null;
  return (
    <div className="mb-8">
      <p className="mb-2 text-sm font-medium">Your schools</p>
      <ul className="grid gap-2">
        {schools.map((school) => (
          <li key={school.subdomain}>
            <Link
              href={`/s/${school.subdomain}`}
              className="flex items-center gap-3 rounded-2xl bg-surface p-3 shadow-raised hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent lg:bg-raise"
            >
              <SchoolMark {...school} className="h-10 w-10 text-[13px]" />
              <span className="min-w-0 flex-1">
                <b className="block truncate font-semibold">{school.name}</b>
                <span className="block truncate text-[12.5px] text-text-secondary">
                  {school.subdomain}.{ROOT}
                </span>
              </span>
              <Icon name="chevron" className="h-4 w-4 text-text-muted" />
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-text-secondary">Or find another school:</p>
    </div>
  );
}
