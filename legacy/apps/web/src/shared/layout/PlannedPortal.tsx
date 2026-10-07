import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { ComingNext } from "../components/PageHeader";
import { AppShell, type NavItem } from "./AppShell";

/**
 * A portal whose menu is designed (design/prototype) but whose pages are still to be built. Every
 * menu item leads somewhere, and each page says so plainly, so people can sign in and look around.
 */
export function PlannedPortal({ nav, portalName, note }: { nav: NavItem[]; portalName: string; note?: ReactNode }) {
  const base = nav[0]!.to;
  return (
    <Routes>
      <Route element={<AppShell nav={nav} note={note} />}>
        {nav.map((item) => {
          const page = <ComingNext title={item.label} portalName={portalName} />;
          return item.to === base ? (
            <Route key={item.to} index element={page} />
          ) : (
            <Route key={item.to} path={item.to.slice(base.length + 1)} element={page} />
          );
        })}
        <Route path="*" element={<Navigate to={base} replace />} />
      </Route>
    </Routes>
  );
}
