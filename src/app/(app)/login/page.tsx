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

export const metadata: Metadata = { title: "Find your school" };

// brillianda.com/login (plan: "Signing in later"). Everyone signs in at their school's own
// address; this page gets them there.
export default function FindMySchoolPage() {
  return (
    <AuthLayout
      title="Find your school"
      description="Each school signs in at its own address, like greenfield.brillianda.com. Enter your email and we’ll send you a link to each of your schools."
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
      <EmailRequestForm
        action={findMySchool}
        submitLabel="Email me my schools"
        pendingLabel="Sending…"
        sent={
          <>
            <p className="font-medium text-text-primary">If that email is on file, we’ve sent a link to each of your schools.</p>
            <p>Nothing arrived? Check your spam folder, or ask your school’s owner for its address.</p>
          </>
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
                <span className="block truncate text-[12.5px] text-text-secondary">{school.subdomain}.brillianda.com</span>
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
