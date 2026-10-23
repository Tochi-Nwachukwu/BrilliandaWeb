import { ROLE_LABEL } from "@brillianda/core/auth";
import { PageSpinner } from "@brillianda/ui/Spinner";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { studentGuide } from "@/components/help/guides";
import { AppShell, type NavItem } from "@/components/shell/AppShell";
import { SchoolMark } from "@/components/school/SchoolBrand";
import { schoolFromParams } from "@/components/school/school";
import { signOut } from "@/data/actions/auth";
import { getCurrentMember } from "@/data/auth";
import { schoolBase } from "@/lib/schoolBase";

// A student's part of the school (batch 23): only themselves. Everyone else goes back to their own screens.
export default function StudentLayout({ children, params }: LayoutProps<"/s/[school]/learn">) {
  return (
    <Suspense fallback={<PageSpinner fullScreen />}>
      <Student params={params}>{children}</Student>
    </Suspense>
  );
}

async function Student({ params, children }: { params: Promise<{ school: string }>; children: React.ReactNode }) {
  const school = await schoolFromParams(params);
  const sb = await schoolBase(school.subdomain);
  const base = sb;
  const me = await getCurrentMember(school.subdomain);
  if (!me) redirect(`${base}/login`);
  if (me.role !== "student") redirect(base || "/");

  const nav: NavItem[] = [
    { href: `${base}/learn`, label: "Today", icon: "home", exact: true, tour: "nav-today" },
    { href: `${base}/learn/tests`, label: "Tests", icon: "scores", tour: "nav-tests" },
    { href: `${base}/learn/timetable`, label: "Timetable", icon: "calendar", tour: "nav-timetable" },
    { href: `${base}/learn/results`, label: "Results", icon: "results", tour: "nav-results" },
    { href: `${base}/learn/books`, label: "Book list", short: "Books", icon: "book", tour: "nav-books" },
  ];

  return (
    <AppShell
      nav={nav}
      help={studentGuide(base)}
      place={school.name}
      placeMark={<SchoolMark {...school} className="h-9 w-9 text-[13px]" />}
      account={{ fullName: me.fullName, roleLabel: ROLE_LABEL[me.role], email: me.email, photo: me.photo, profileHref: `${base}/learn/profile` }}
      sampleData
      signOut={signOut.bind(null, school.subdomain)}
      mark={
        <span className="flex min-w-0 items-center gap-2.5">
          <SchoolMark {...school} className="h-9 w-9 text-[13px]" />
          <span className="truncate text-[17px] font-semibold tracking-tight">{school.name}</span>
        </span>
      }
    >
      {children}
    </AppShell>
  );
}
