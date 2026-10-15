// Home, the setup checklist and the school calendar, on the Brillianda API. Same functions and
// shapes as ../fake/home.ts.
import "server-only";
import { ms } from "@brillianda/core/apiBridge";
import type { SessionInput } from "@brillianda/core/calendar";
import type { ActionResult, HomeSummary, SessionSetup, SetupProgress } from "../types";
import { api, fail, read } from "./client";

export async function getSession(subdomain: string): Promise<SessionSetup | null> {
  return read<SessionSetup>(subdomain, "/v1/session");
}

export async function saveSession(subdomain: string, input: SessionInput): Promise<ActionResult<SessionSetup>> {
  const result = await api<SessionSetup>(subdomain, "/v1/session", { method: "PUT", body: { startYear: input.startYear, terms: input.terms } });
  return result.ok ? { ok: true, data: result.data } : fail(result);
}

export async function getSetupProgress(subdomain: string): Promise<SetupProgress | null> {
  return read<SetupProgress>(subdomain, "/v1/setup");
}

export async function hideChecklist(subdomain: string, hidden: boolean): Promise<ActionResult<null>> {
  const result = await api(subdomain, "/v1/setup/hidden", { method: "PUT", body: { hidden } });
  return result.ok ? { ok: true, data: null } : fail(result);
}

type Summary = Omit<HomeSummary, "recent"> & { recent: { id: string; at: string; who: string; what: string }[] };

export async function getHomeSummary(subdomain: string): Promise<HomeSummary | null> {
  const s = await read<Summary>(subdomain, "/v1/home");
  return s ? { ...s, recent: s.recent.map((r) => ({ ...r, at: ms(r.at) })) } : null;
}
