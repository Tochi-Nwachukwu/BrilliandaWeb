import type { SessionResponse, ValidationErrorBody } from "@brillanda/shared-types";
import { useAuthStore } from "../auth/authStore";

const API_BASE = "/api/v1";
const OFFLINE_MESSAGE = "Can't reach Brillanda. Check your internet connection and try again.";

export class ApiError extends Error {
  readonly status: number;
  /** Field-level messages from a 400 response, keyed by field name. */
  readonly fields: Record<string, string[] | undefined>;

  constructor(status: number, message: string, fields: Record<string, string[] | undefined> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

// Absolute URLs so the same code runs in the browser and in tests.
const toUrl = (path: string) => new URL(`${API_BASE}${path}`, window.location.origin).toString();

async function toApiError(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as Partial<ValidationErrorBody> | null;
  return new ApiError(res.status, body?.error ?? "Something went wrong. Please try again.", body?.fields ?? {});
}

let refreshInFlight: Promise<boolean> | null = null;

/** Swaps the httpOnly refresh cookie for a new access token. Callers arriving together share one request. */
export function refreshSession(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    try {
      const res = await fetch(toUrl("/auth/refresh"), { method: "POST", credentials: "same-origin" });
      if (!res.ok) {
        useAuthStore.getState().clearSession();
        return false;
      }
      const session = (await res.json()) as SessionResponse;
      useAuthStore.getState().setSession(session.accessToken, session.user);
      return true;
    } catch {
      // Offline: keep whatever session is in memory, but don't leave startup waiting forever.
      if (useAuthStore.getState().status === "unknown") useAuthStore.getState().clearSession();
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

type RequestOptions = { method?: string; body?: unknown };

export async function api<T>(path: string, { method = "GET", body }: RequestOptions = {}): Promise<T> {
  // A file upload goes as it is; the browser sets its multipart Content-Type.
  const isForm = body instanceof FormData;
  const send = async (token: string | null) => {
    try {
      return await fetch(toUrl(path), {
        method,
        credentials: "same-origin",
        headers: {
          ...(body !== undefined && !isForm ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      });
    } catch {
      throw new ApiError(0, OFFLINE_MESSAGE);
    }
  };

  const sentToken = useAuthStore.getState().accessToken;
  let res = await send(sentToken);

  // Expired access token: refresh once and retry. If another request already refreshed it,
  // just retry with the new token. Auth endpoints report their own 401s.
  if (res.status === 401 && !path.startsWith("/auth/")) {
    const current = useAuthStore.getState().accessToken;
    const renewed = current !== null && current !== sentToken ? true : await refreshSession();
    if (renewed) res = await send(useAuthStore.getState().accessToken);
  }

  if (!res.ok) throw await toApiError(res);
  return (res.status === 204 ? undefined : await res.json()) as T;
}
