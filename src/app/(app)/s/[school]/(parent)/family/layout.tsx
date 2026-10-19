import { ROLE_LABEL } from "@brillianda/core/auth";
import { PageSpinner } from "@brillianda/ui/Spinner";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { parentGuide } from "@/components/help/guides";
import { AppShell, type NavItem } from "@/components/shell/AppShell";
import { SchoolMark } from "@/components/school/SchoolBrand";
import { schoolFromParams } from "@/components/school/school";
import { signOut } from "@/data/actions/auth";
import { getCurrentMember } from "@/data/auth";

// A parent's part of the school (batch 12): their own children, nothing else. Everyone else goes
// back to the school's own screens.
export default function ParentLayout({ children, params }: LayoutProps<"/s/[school]/family">) {
  return (
    <Suspense fallback={<PageSpinner fullScreen />}>
      <Parent params={params}>{children}</Parent>
    </Suspense>
  );
}

async function Parent({ params, children }: { params: Promise<{ school: string }>; children: React.ReactNode }) {
  const school = await schoolFromParams(params);
  const base = `/s/${school.subdomain}`;
  const me = await getCurrentMember(school.subdomain);
  if (!me) redirect(`${base}/login`);
  if (me.role !== "parent") redirect(base);

  const nav: NavItem[] = [{ href: `${base}/family`, label: "My children", short: "Children", icon: "students", tour: "nav-children" }];

  return (
    <AppShell
      nav={nav}
      help={parentGuide(base)}
      place={school.name}
      account={{ fullName: me.fullName, roleLabel: ROLE_LABEL[me.role], email: me.email, photo: me.photo, profileHref: `${base}/family/profile` }}
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
