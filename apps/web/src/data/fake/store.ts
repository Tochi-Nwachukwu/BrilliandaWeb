// FAKE: sample data for every fake data function, kept in memory on the server until the backend
// replaces it (docs/data-contract.md). It resets when the dev server restarts. Kept on globalThis
// so a hot reload in development doesn't wipe it.
import "server-only";
import type { SchoolSummary } from "../types";

type FakeStore = { schools: SchoolSummary[] };

function seed(): FakeStore {
  return {
    schools: [
      { subdomain: "greenfield", name: "Greenfield College", status: "active", brandColor: "#4A3AA7", logoUrl: null },
      { subdomain: "surebloom", name: "Surebloom School", status: "active", brandColor: "#1E6B45", logoUrl: null },
      { subdomain: "closedschool", name: "Closed School", status: "suspended", brandColor: "#4A3AA7", logoUrl: null },
    ],
  };
}

const holder = globalThis as unknown as { __brilliandaFakeStore?: FakeStore };
export const store: FakeStore = (holder.__brilliandaFakeStore ??= seed());
