import type { Role } from "@brillanda/shared-types";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { refreshSession } from "../api/client";
import { PageSpinner } from "../components/Spinner";
import { authApi } from "./authApi";
import { useAuthStore } from "./authStore";

/** Each role has its own portal (DECISIONS.md D-8). */
export function homePathFor(role: Role): string {
  switch (role) {
    case "SUPER_ADMIN":
      return "/super-admin";
    case "SCHOOL_ADMIN":
      return "/admin";
    case "TEACHER":
      return "/teacher";
    case "PARENT":
    case "STUDENT":
      return "/portal";
  }
}

/** Where to go after logging in: back to the page that asked for login, if it's in this user's portal. */
export function destinationAfterLogin(role: Role, locationState: unknown): string {
  const home = homePathFor(role);
  const from = (locationState as { from?: string } | null)?.from;
  return from?.startsWith(home) ? from : home;
}

/** Restores a saved session from the refresh cookie once, on startup. */
export function useRestoreSession() {
  const status = useAuthStore((state) => state.status);
  useEffect(() => {
    if (status === "unknown") void refreshSession();
  }, [status]);
}

export function RequireRole({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (status === "unknown") return <PageSpinner fullScreen />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!roles.includes(user.role)) return <Navigate to={homePathFor(user.role)} replace />;
  return children;
}

export function HomeRedirect() {
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);
  if (status === "unknown") return <PageSpinner fullScreen />;
  return <Navigate to={user ? homePathFor(user.role) : "/login"} replace />;
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return async () => {
    // Leave locally even if the network is down; the server session expires on its own.
    await authApi.logout().catch(() => undefined);
    useAuthStore.getState().clearSession();
    queryClient.clear();
    navigate("/login", { replace: true });
  };
}
