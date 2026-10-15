// The change history on the Brillianda API. Same function and shape as ../fake/changes.ts; the
// filtering happens there.
import "server-only";
import { ms } from "@brillianda/core/apiBridge";
import type { ChangeFilter, ChangeLog } from "../types";
import { read } from "./client";

type Log = Omit<ChangeLog, "entries"> & { entries: (Omit<ChangeLog["entries"][number], "at"> & { at: string })[] };

export async function listChanges(subdomain: string, filter: ChangeFilter): Promise<ChangeLog | null> {
  const log = await read<Log>(subdomain, "/v1/changes", { ...filter });
  return log ? { ...log, entries: log.entries.map((e) => ({ ...e, at: ms(e.at) })) } : null;
}
