// The school a page belongs to, and its branding, on the Brillianda API. Same functions and shapes
// as ../fake/school.ts.
import "server-only";
import { DEFAULT_BRAND_COLOR, type Branding } from "@brillianda/core/branding";
import { cache } from "react";
import type { ActionResult, SchoolSummary } from "../types";
import { api, fail } from "./client";

type PublicSchool = { name: string; subdomain: string; brandColor: string | null; logoUrl: string | null };

/**
 * The API serves the logo at `/api/v1/school/logo?v=…` on the school's own address. On staging our
 * pages for every school share one address, so the school goes in the path (proxy.ts forwards it).
 */
function logoOn(subdomain: string, url: string | null): string | null {
  if (!url || !process.env.API_ROOT_DOMAIN || !url.startsWith("/api/")) return url;
  return `/s/${subdomain}${url}`;
}

function summary(subdomain: string, s: PublicSchool): SchoolSummary {
  return { subdomain: s.subdomain || subdomain, name: s.name, status: "active", brandColor: s.brandColor ?? DEFAULT_BRAND_COLOR, logoUrl: logoOn(subdomain, s.logoUrl) };
}

export const getSchoolBySubdomain = cache(async (subdomain: string): Promise<SchoolSummary | null> => {
  const result = await api<PublicSchool>(subdomain.toLowerCase(), "/v1/school");
  if (result.ok) return summary(subdomain, result.data);
  // Paused or closed: the page says so rather than "no school here". The API doesn't give its name.
  if (result.problem.code === "school_unavailable") return { subdomain, name: subdomain, status: "suspended", brandColor: DEFAULT_BRAND_COLOR, logoUrl: null };
  return null;
});

const OWNER_ONLY = "Only the school owner can change the school’s name, colour and logo.";

function brandingFail(result: Parameters<typeof fail>[0]) {
  return result.problem.code === "forbidden" ? { ok: false as const, error: OWNER_ONLY } : fail(result);
}

export async function updateBranding(subdomain: string, input: Branding): Promise<ActionResult<SchoolSummary>> {
  const result = await api<PublicSchool>(subdomain, "/v1/school/branding", { method: "PATCH", body: input });
  return result.ok ? { ok: true, data: summary(subdomain, result.data) } : brandingFail(result);
}

export async function setLogo(subdomain: string, file: File): Promise<ActionResult<SchoolSummary>> {
  const form = new FormData();
  form.set("logo", file);
  const result = await api<PublicSchool>(subdomain, "/v1/school/logo", { method: "PUT", form });
  return result.ok ? { ok: true, data: summary(subdomain, result.data) } : brandingFail(result);
}

export async function removeLogo(subdomain: string): Promise<ActionResult<SchoolSummary>> {
  const result = await api<PublicSchool>(subdomain, "/v1/school/logo", { method: "DELETE" });
  return result.ok ? { ok: true, data: summary(subdomain, result.data) } : brandingFail(result);
}
