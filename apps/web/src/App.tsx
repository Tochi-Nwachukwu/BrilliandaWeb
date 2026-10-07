import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ApiError } from "./shared/api/client";
import { LoginPage } from "./shared/auth/LoginPage";
import { AcceptInvitePage, ForgotPasswordPage, ResetPasswordPage } from "./shared/auth/PasswordPages";
import { HomeRedirect, RequireRole, useRestoreSession } from "./shared/auth/session";
import { PageSpinner } from "./shared/components/Spinner";

// One app, one folder per portal (DECISIONS.md D-8). Each portal loads only when its user
// arrives, so a parent's phone never downloads the teacher or admin screens.
const TeacherPortal = lazy(() => import("./portals/teacher/TeacherPortal"));
const AdminPortal = lazy(() => import("./portals/admin/AdminPortal"));
const ParentPortal = lazy(() => import("./portals/parent/ParentPortal"));
const SuperAdminPortal = lazy(() => import("./portals/super-admin/SuperAdminPortal"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      // Retry network blips, not answers: a 4xx won't change by asking again.
      retry: (failures, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failures < 2,
    },
  },
});

export function AppRoutes() {
  useRestoreSession();

  return (
    <Suspense fallback={<PageSpinner fullScreen />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="/invite/:token" element={<AcceptInvitePage />} />
        <Route path="/teacher/*" element={<RequireRole roles={["TEACHER"]}><TeacherPortal /></RequireRole>} />
        <Route path="/admin/*" element={<RequireRole roles={["SCHOOL_ADMIN"]}><AdminPortal /></RequireRole>} />
        <Route path="/portal/*" element={<RequireRole roles={["PARENT", "STUDENT"]}><ParentPortal /></RequireRole>} />
        <Route path="/super-admin/*" element={<RequireRole roles={["SUPER_ADMIN"]}><SuperAdminPortal /></RequireRole>} />
        <Route path="*" element={<HomeRedirect />} />
      </Routes>
    </Suspense>
  );
}

/** Opts in to React Router v7 behaviour now, so the eventual upgrade changes nothing. */
export const ROUTER_FUTURE = { v7_startTransition: true, v7_relativeSplatPath: true } as const;

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter future={ROUTER_FUTURE}>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
