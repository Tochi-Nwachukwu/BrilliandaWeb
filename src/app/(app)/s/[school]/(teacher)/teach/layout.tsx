import { ROLE_LABEL } from "@brillianda/core/auth";
import { PageSpinner } from "@brillianda/ui/Spinner";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell, type NavItem } from "@/components/shell/AppShell";
import { SchoolMark } from "@/components/school/SchoolBrand";
import { schoolFromParams } from "@/components/school/school";
import { signOut } from "@/data/actions/auth";
import { getCurrentMember } from "@/data/auth";

// A teacher's part of the school (batch 11): today, their register, their subjects. Owners and
// admins go back to the admin screens, where every class's register is too.
export default function TeacherLayout({ children, params }: LayoutProps<"/s/[school]/teach">) {
  return (
    <Suspense fallback={<PageSpinner fullScreen />}>
      <Teacher params={params}>{children}</Teacher>
    </Suspense>
  );
}

async function Teacher({ params, children }: { params: Promise<{ school: string }>; children: React.ReactNode }) {
  const school = await schoolFromParams(params);
  const base = `/s/${school.subdomain}`;
  const me = await getCurrentMember(school.subdomain);
  if (!me) redirect(`${base}/login`);
  if (me.role !== "teacher") redirect(base);

  const nav: NavItem[] = [
    { href: `${base}/teach`, label: "Today", icon: "home", exact: true },
    { href: `${base}/teach/register`, label: "Register", icon: "check" },
    { href: `${base}/teach/subjects`, label: "My subjects", short: "Subjects", icon: "subjects" },
  ];

  return (
    <AppShell
      nav={nav}
      place={school.name}
      account={{ fullName: me.fullName, roleLabel: ROLE_LABEL[me.role] }}
      sampleData
      signOut={signOut.bind(null, school.subdomain)}
      mark={
        <span className="flex min-w-0 items-center gap-2.5">
          <SchoolMark {...school} className="h-9 w-9 text-[13px]" />
          <span className="truncate text-[17px] font-semibold tracking-tight">{school.name}</span>
        </span>
      }
      note={
        <>
          <b className="mb-0.5 block text-text-primary">Coming soon</b>
          Scores and report cards.
        </>
      }
    >
      {children}
    </AppShell>
  );
}
