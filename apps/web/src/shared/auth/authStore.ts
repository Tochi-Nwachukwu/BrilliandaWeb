import type { SessionUser } from "@brillanda/shared-types";
import { create } from "zustand";

type AuthState = {
  /** "unknown" until the saved session (the refresh cookie) has been checked on startup. */
  status: "unknown" | "authenticated" | "anonymous";
  accessToken: string | null;
  user: SessionUser | null;
  setSession: (accessToken: string, user: SessionUser) => void;
  clearSession: () => void;
};

// The access token lives in memory only; the refresh token is an httpOnly cookie that
// JavaScript never sees (DECISIONS.md F-23).
export const useAuthStore = create<AuthState>()((set) => ({
  status: "unknown",
  accessToken: null,
  user: null,
  setSession: (accessToken, user) => set({ status: "authenticated", accessToken, user }),
  clearSession: () => set({ status: "anonymous", accessToken: null, user: null }),
}));
