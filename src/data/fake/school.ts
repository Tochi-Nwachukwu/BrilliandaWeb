// FAKE: school lookups and branding on sample data. The backend replaces this with a cached query
// by subdomain, and keeps logos in private storage behind short-lived signed URLs.
import "server-only";
import { LOGO_UPLOAD_MAX_BYTES, logoProblem, type Branding } from "@brillianda/core/branding";
import type { ActionResult, SchoolSummary } from "../types";
import { requireMember } from "./auth";
import { recordChange } from "./changes";
import { store } from "./store";

const pause = () => new Promise((resolve) => setTimeout(resolve, 300));
const OWNER_ONLY = "Only the school owner can change the school’s name, colour and logo.";

export async function getSchoolBySubdomain(subdomain: string): Promise<SchoolSummary | null> {
  return store.schools.find((s) => s.subdomain === subdomain.toLowerCase()) ?? null;
}

function schoolOf(subdomain: string) {
  return store.schools.find((s) => s.subdomain === subdomain.toLowerCase()) ?? null;
}

export async function updateBranding(subdomain: string, input: Branding): Promise<ActionResult<SchoolSummary>> {
  await pause();
  const owner = await requireMember(subdomain, "owner");
  const school = schoolOf(subdomain);
  if (!owner || !school) return { ok: false, error: OWNER_ONLY };
  const changed = [input.name !== school.name && `name to ${input.name}`, input.brandColor !== school.brandColor && `colour to ${input.brandColor}`].filter(Boolean);
  Object.assign(school, input);
  store.brandingSaved.add(school.subdomain);
  if (changed.length) recordChange(school.subdomain, owner.fullName, `Changed the school’s ${changed.join(" and ")}`);
  return { ok: true, data: { ...school } };
}

/** FAKE ONLY: keeps the image in memory as a data URL. The real one stores the file. */
export async function setLogo(subdomain: string, file: File): Promise<ActionResult<SchoolSummary>> {
  await pause();
  const owner = await requireMember(subdomain, "owner");
  const school = schoolOf(subdomain);
  if (!owner || !school) return { ok: false, error: OWNER_ONLY };
  const problem = logoProblem(file, LOGO_UPLOAD_MAX_BYTES);
  if (problem) return { ok: false, error: problem };
  const had = school.logoUrl !== null;
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  school.logoUrl = `data:${file.type};base64,${base64}`;
  store.brandingSaved.add(school.subdomain);
  recordChange(school.subdomain, owner.fullName, had ? "Replaced the logo" : "Uploaded a logo");
  return { ok: true, data: { ...school } };
}

export async function removeLogo(subdomain: string): Promise<ActionResult<SchoolSummary>> {
  await pause();
  const owner = await requireMember(subdomain, "owner");
  const school = schoolOf(subdomain);
  if (!owner || !school) return { ok: false, error: OWNER_ONLY };
  school.logoUrl = null;
  recordChange(school.subdomain, owner.fullName, "Removed the logo");
  return { ok: true, data: { ...school } };
}
