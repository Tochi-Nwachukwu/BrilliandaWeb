import { PageSpinner } from "@brillianda/ui/Spinner";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { consoleGuide } from "@/components/help/guides";
import { AppShell, type NavItem } from "@/components/shell/AppShell";
import { teamSignOut } from "@/data/actions/console";
import { getTeamMember } from "@/data/console";

// The Brillianda team console (batch 13): every school, trial requests, and what the team did.
export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<PageSpinner fullScreen />}>
      <Console>{children}</Console>
    </Suspense>
  );
}

async function Console({ children }: { children: React.ReactNode }) {
  const me = await getTeamMember();
  if (!me) redirect("/console/login");
  const nav: NavItem[] = [
    { href: "/console", label: "Overview", icon: "home", exact: true, tour: "nav-overview" },
    { href: "/console/schools", label: "Schools", icon: "school", tour: "nav-schools" },
    { href: "/console/trials", label: "Trial requests", short: "Trials", icon: "inbox", tour: "nav-trials" },
  ];
  return (
    <AppShell
      nav={nav}
      help={consoleGuide()}
      place="Brillianda team"
      account={{ fullName: me.fullName, roleLabel: "Brillianda team", email: me.email }}
      sampleData
      signOut={teamSignOut}
      mark={
        <span className="flex items-center gap-2.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-accent" />
          <span className="text-[17px] font-semibold tracking-tight">Brillianda team</span>
        </span>
      }
    >
      {children}
    </AppShell>
  );
}
