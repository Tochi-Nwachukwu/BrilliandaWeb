import { ROLE_LABEL } from "@brillianda/core";
import { PageSpinner } from "@brillianda/ui";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppShell, type NavItem } from "@/components/shell/AppShell";
import { SchoolMark } from "@/components/school/SchoolBrand";
import { schoolFromParams } from "@/components/school/school";
import { signOut } from "@/data/actions/auth";
import { getCurrentMember } from "@/data/auth";

// The signed-in part of a school: the shell with the plan's tabs. Anyone not signed in at this
// school goes to its sign-in page.
export default function SchoolAppLayout({ children, params }: LayoutProps<"/s/[school]">) {
  return (
    <Suspense fallback={<PageSpinner fullScreen />}>
      <SchoolApp params={params}>{children}</SchoolApp>
    </Suspense>
  );
}

async function SchoolApp({ params, children }: { params: Promise<{ school: string }>; children: React.ReactNode }) {
  const school = await schoolFromParams(params);
  const base = `/s/${school.subdomain}`;
  const me = await getCurrentMember(school.subdomain);
  if (!me) redirect(`${base}/login`);

  const nav: NavItem[] = [
    { href: base, label: "Home", icon: "home", exact: true },
    { href: `${base}/students`, label: "Students", icon: "students" },
    { href: `${base}/classes`, label: "Classes", icon: "classes" },
    { href: `${base}/subjects`, label: "Subjects", icon: "subjects" },
    { href: `${base}/more`, label: "More", icon: "more" },
  ];

  return (
    <AppShell
      nav={nav}
      place={school.name}
      account={{ fullName: me.fullName, roleLabel: ROLE_LABEL[me.role] }}
      sampleData
      signOut={signOut.bind(null, school.subdomain)}
      commands={[
        { id: "admins", label: "Admins", icon: "staff", href: `${base}/more/admins`, group: "Go to" },
        { id: "sessions", label: "Sessions and terms", icon: "calendar", href: `${base}/more/sessions`, group: "Go to" },
      ]}
      mark={
        <span className="flex min-w-0 items-center gap-2.5">
          <SchoolMark {...school} className="h-9 w-9 text-[13px]" />
          <span className="truncate text-[17px] font-semibold tracking-tight">{school.name}</span>
        </span>
      }
      note={
        <>
          <b className="mb-0.5 block text-text-primary">Coming soon</b>
          Attendance, fees, timetable and messages.
        </>
      }
    >
      {children}
    </AppShell>
  );
}
