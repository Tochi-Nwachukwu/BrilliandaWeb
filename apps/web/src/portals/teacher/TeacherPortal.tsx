import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell, type NavItem } from "../../shared/layout/AppShell";
import { TeacherClasses, TeacherDashboard } from "./TeacherDashboard";
import { ScoreEntryPage } from "./score-entry/ScoreEntryPage";

// Two items only: a teacher's job is their classes (Build Guide §7). The shared shell replaces the
// earlier bare header so every portal looks and moves the same way (DECISIONS.md D-16).
const NAV: NavItem[] = [
  { to: "/teacher", label: "Home", icon: "home", end: true },
  { to: "/teacher/classes", label: "My classes", short: "Classes", icon: "classes" },
];

export default function TeacherPortal() {
  return (
    <Routes>
      <Route element={<AppShell nav={NAV} />}>
        <Route index element={<TeacherDashboard />} />
        <Route path="classes" element={<TeacherClasses />} />
        <Route path="score-entry/:armId/:subjectId/:termId" element={<ScoreEntryPage />} />
        <Route path="*" element={<Navigate to="/teacher" replace />} />
      </Route>
    </Routes>
  );
}
