import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell, type NavItem } from "../../shared/layout/AppShell";
import { ProfileSettings } from "../../shared/layout/ProfileSettings";
import { useChildren } from "./api";
import { HomePage } from "./HomePage";
import { ResultsPage } from "./ResultsPage";

// The parent portal, built from the prototype (design/prototype). Mostly used on phones.
export default function ParentPortal() {
  const children = useChildren();
  const unseen = children.data?.filter((c) => c.latest && !c.latest.seen).length ?? 0;

  const nav: NavItem[] = [
    { to: "/portal", label: "Home", icon: "home", end: true },
    { to: "/portal/results", label: "Results", icon: "results", count: unseen },
    { to: "/portal/settings", label: "Settings", icon: "settings" },
  ];

  return (
    <Routes>
      <Route element={<AppShell nav={nav} />}>
        <Route index element={<HomePage />} />
        <Route path="results" element={<ResultsPage />} />
        <Route path="settings" element={<ProfileSettings roleLabel="Parent" />} />
        <Route path="*" element={<Navigate to="/portal" replace />} />
      </Route>
    </Routes>
  );
}
