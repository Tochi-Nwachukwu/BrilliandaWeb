// FAKE: the school's record of changes (the plan's audit log, once the backend has it).
import "server-only";
import { store } from "./store";

/** Adds a line to a school's record of changes. */
export function recordChange(subdomain: string, who: string, what: string) {
  store.changes.push({ id: crypto.randomUUID(), subdomain, at: Date.now(), who, what });
}
