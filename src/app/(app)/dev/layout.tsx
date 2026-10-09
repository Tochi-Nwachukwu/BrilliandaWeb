import { notFound } from "next/navigation";
import { AppShell, type NavItem } from "@/components/shell/AppShell";
import { devSignOut } from "./actions";

// A playground for the shell and the shared components. Not part of the product: it 404s in
// production builds, except the one the browser tests run against (BRILLIANDA_PLAYGROUND=1).
const NAV: NavItem[] = [
  { href: "/dev", label: "Home", icon: "home", exact: true },
  { href: "/dev/students", label: "Students", icon: "students" },
  { href: "/dev/classes", label: "Classes", icon: "classes" },
  { href: "/dev/subjects", label: "Subjects", icon: "subjects" },
  { href: "/dev/more", label: "More", icon: "more", count: 2 },
];

export default function DevLayout({ children }: LayoutProps<"/dev">) {
  if (process.env.NODE_ENV === "production" && process.env.BRILLIANDA_PLAYGROUND !== "1") notFound();
  return (
    <AppShell
      nav={NAV}
      place="Greenfield College"
      account={{ fullName: "Amaka Obi", roleLabel: "School owner" }}
      sampleData
      signOut={devSignOut}
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
