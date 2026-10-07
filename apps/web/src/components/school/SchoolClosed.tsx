import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { authLinkClass } from "@/components/auth/styles";
import type { SchoolSummary } from "@/data/types";

/** A suspended or archived school: say so plainly, and who can fix it. */
export function SchoolClosed({ school }: { school: SchoolSummary }) {
  const archived = school.status === "archived";
  return (
    <AuthLayout
      school={school}
      title={archived ? "This school has closed its account" : "This school’s account is paused"}
      description={
        <>
          <p>{archived ? `${school.name} no longer uses Brillianda, so its pages are closed.` : `${school.name} can’t be used at the moment. Its records are safe and nothing has been deleted.`}</p>
          <p>If you run the school, email hello@brillianda.com and we’ll help you sort it out.</p>
        </>
      }
      footer={
        <>
          Looking for another school?{" "}
          <Link href="/login" className={authLinkClass}>
            Find your school
          </Link>
        </>
      }
    />
  );
}
