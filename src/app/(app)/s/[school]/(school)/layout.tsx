import { ROLE_LABEL } from "@brillianda/core/auth";
import { PageSpinner } from "@brillianda/ui/Spinner";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { adminGuide } from "@/components/help/guides";
import { AppShell, type NavItem } from "@/components/shell/AppShell";
import { SchoolMark } from "@/components/school/SchoolBrand";
import { schoolFromParams } from "@/components/school/school";
import { signOut } from "@/data/actions/auth";
import { getCurrentMember } from "@/data/auth";
import { countOpenCorrections } from "@/data/corrections";
import { LIVE } from "@/data/source";

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
  // Teachers have their own screens (batch 11); the admin ones stay closed to them.
  if (me.role === "teacher") redirect(`${base}/teach`);
  if (me.role === "parent") redirect(`${base}/family`);
  // Parents' correction requests waiting (batch 21), on the More tab.
  const waiting = await countOpenCorrections(school.subdomain);

  const nav: NavItem[] = [
    { href: base, label: "Home", icon: "home", exact: true, tour: "nav-home" },
    { href: `${base}/students`, label: "Students", icon: "students", tour: "nav-students" },
    { href: `${base}/classes`, label: "Classes", icon: "classes", tour: "nav-classes" },
    { href: `${base}/results`, label: "Results", icon: "results", tour: "nav-results" },
    { href: `${base}/more`, label: "More", icon: "more", tour: "nav-more", count: waiting },
  ];

  return (
    <AppShell
      nav={nav}
      place={school.name}
      account={{ fullName: me.fullName, roleLabel: ROLE_LABEL[me.role] }}
      sampleData={!LIVE}
      help={adminGuide(base)}
      signOut={signOut.bind(null, school.subdomain)}
      commands={[
        { id: "admins", label: "Admins", icon: "staff", href: `${base}/more/admins`, group: "Go to" },
        { id: "teachers", label: "Teachers", icon: "staff", href: `${base}/more/teachers`, group: "Go to" },
        { id: "subjects", label: "Subjects", icon: "subjects", href: `${base}/subjects`, group: "Go to" },
        { id: "results-settings", label: "Results settings", icon: "results", href: `${base}/more/results`, group: "Go to" },
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
          Fees and messages.
        </>
      }
    >
      {children}
    </AppShell>
  );
}
