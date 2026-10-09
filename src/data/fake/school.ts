// FAKE: school lookups on sample data. The backend replaces this with a cached query by subdomain.
import "server-only";
import type { SchoolSummary } from "../types";
import { store } from "./store";

export async function getSchoolBySubdomain(subdomain: string): Promise<SchoolSummary | null> {
  return store.schools.find((s) => s.subdomain === subdomain.toLowerCase()) ?? null;
}
