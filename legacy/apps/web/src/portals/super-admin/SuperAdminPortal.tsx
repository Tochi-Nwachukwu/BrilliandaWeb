import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell, type NavItem } from "../../shared/layout/AppShell";
import { ProfileSettings } from "../../shared/layout/ProfileSettings";
import { ActivityPage } from "./ActivityPage";
import { isOpen, useTrialRequests } from "./api";
import { OverviewPage } from "./OverviewPage";
import { SchoolsPage } from "./SchoolsPage";
import { TrialRequestsPage } from "./TrialRequestsPage";

// The Brillanda team portal (SUPER_ADMIN), built from the prototype (design/prototype).
export default function SuperAdminPortal() {
  const trials = useTrialRequests();
  const waiting = trials.data?.filter(isOpen).length ?? 0;

  const nav: NavItem[] = [
    { to: "/super-admin", label: "Overview", icon: "home", end: true },
    { to: "/super-admin/schools", label: "Schools", icon: "school" },
    { to: "/super-admin/trials", label: "Trial requests", short: "Trials", icon: "inbox", count: waiting },
    { to: "/super-admin/activity", label: "Activity", icon: "activity" },
    { to: "/super-admin/settings", label: "Settings", icon: "settings" },
  ];

  return (
    <Routes>
      <Route
        element={
          <AppShell
            nav={nav}
            note={
              <>
                <b className="mb-0.5 block text-text-primary">Trial requests</b>
                {waiting ? `${waiting} waiting for you` : "None waiting"}
              </>
            }
          />
        }
      >
        <Route index element={<OverviewPage />} />
        <Route path="schools" element={<SchoolsPage />} />
        <Route path="trials" element={<TrialRequestsPage />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="settings" element={<ProfileSettings roleLabel="Brillanda team" />} />
        <Route path="*" element={<Navigate to="/super-admin" replace />} />
      </Route>
    </Routes>
  );
}
