import type { InviteDetails, SessionResponse } from "@brillanda/shared-types";
import { api } from "../api/client";

const post = <T>(path: string, body?: unknown) => api<T>(path, { method: "POST", body });
const tokenPath = (token: string) => encodeURIComponent(token);

export const authApi = {
  login: (email: string, password: string) => post<SessionResponse>("/auth/login", { email, password }),
  // The slip is typed by hand: any case, with or without the dashes it was printed with.
  loginWithCode: (code: string) =>
    post<SessionResponse>("/auth/access-code", { code: code.replace(/[\s-]/g, "").toUpperCase() }),
  logout: () => post<void>("/auth/logout"),
  forgotPassword: (email: string) => post<{ message: string }>("/auth/forgot-password", { email }),
  resetPassword: (token: string, password: string) => post<void>("/auth/reset-password", { token, password }),
  getInvite: (token: string) => api<InviteDetails>(`/auth/invite/${tokenPath(token)}`),
  acceptInvite: (token: string, password: string) =>
    post<SessionResponse>(`/auth/invite/${tokenPath(token)}/accept`, { password }),
};
