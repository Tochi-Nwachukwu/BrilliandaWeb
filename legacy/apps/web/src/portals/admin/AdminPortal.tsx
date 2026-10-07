import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { PageSpinner } from "../../shared/components/Spinner";
import { AppShell, type NavItem } from "../../shared/layout/AppShell";
import { useOverview, useSetup } from "./api";
import { AdminSheetPage, ArmPage } from "./ArmPage";
import { ClassesPage } from "./ClassesPage";
import { FirstRunPage } from "./FirstRunPage";
import { HomePage } from "./HomePage";
import { ImportPage } from "./ImportPage";
import { PromotionPage } from "./PromotionPage";
import { PublishingPage } from "./PublishingPage";
import { SettingsPage } from "./SettingsPage";
import { StaffPage } from "./StaffPage";
import { StudentPage } from "./StudentPage";
import { StudentsPage } from "./StudentsPage";

// The school admin portal, built from the prototype (design/prototype).
export default function AdminPortal() {
  const overview = useOverview();
  const setup = useSetup();
  const { pathname } = useLocation();
  const ready = overview.data?.armsReadyToPublish ?? 0;

  // A new school's admin starts with the first run (F-39). If setup can't be loaded, the portal still opens.
  if (setup.isPending) return <PageSpinner />;
  const firstRun = setup.data && !setup.data.firstRunDone;
  if (firstRun && !pathname.startsWith("/admin/welcome")) return <Navigate to="/admin/welcome" replace />;

  const nav: NavItem[] = [
    { to: "/admin", label: "Home", icon: "home", end: true },
    { to: "/admin/classes", label: "Classes", icon: "classes" },
    { to: "/admin/publishing", label: "Publishing", short: "Publish", icon: "publish", count: ready },
    { to: "/admin/students", label: "Students", icon: "students" },
    { to: "/admin/staff", label: "Staff", icon: "staff" },
    { to: "/admin/settings", label: "Settings", icon: "settings" },
  ];

  return (
    <Routes>
      <Route path="welcome" element={firstRun ? <FirstRunPage /> : <Navigate to="/admin" replace />} />
      <Route
        element={
          <AppShell
            nav={nav}
            note={
              <>
                <b className="mb-0.5 block text-text-primary">Coming soon</b>
                Attendance, fees, timetable and messages.
              </>
            }
          />
        }
      >
        <Route index element={<HomePage />} />
        <Route path="classes" element={<ClassesPage />} />
        <Route path="classes/:armId" element={<ArmPage />} />
        <Route path="classes/:armId/sheets/:subjectId" element={<AdminSheetPage />} />
        <Route path="publishing" element={<PublishingPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="students/import" element={<ImportPage />} />
        <Route path="students/:studentId" element={<StudentPage />} />
        <Route path="staff" element={<StaffPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="session/promotion" element={<PromotionPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}
