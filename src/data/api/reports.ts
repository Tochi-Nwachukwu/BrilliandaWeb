// Broadsheets, remarks, ratings, publishing and report cards, on the Brillianda API. Same
// functions and shapes as ../fake/reports.ts.
import "server-only";
import type { RatingSettings } from "@brillianda/core/results";
import type { ActionResult, Broadsheet, ClassReports, ReportCardData, ReportTerm } from "../types";
import { api, fail, read } from "./client";

const id = encodeURIComponent;

export async function getBroadsheet(subdomain: string, armId: string): Promise<Broadsheet | null> {
  return read<Broadsheet>(subdomain, `/v1/arms/${id(armId)}/broadsheet`);
}

export async function getClassReports(subdomain: string, armId: string): Promise<ClassReports | null> {
  return read<ClassReports>(subdomain, `/v1/arms/${id(armId)}/reports`);
}

export async function saveRemark(subdomain: string, armId: string, studentId: string, kind: "teacher" | "principal", text: string): Promise<ActionResult<null>> {
  const result = await api(subdomain, `/v1/arms/${id(armId)}/students/${id(studentId)}/remarks/${kind}`, { method: "PUT", body: { text } });
  return result.ok ? { ok: true, data: null } : fail(result);
}

export async function saveRating(subdomain: string, armId: string, studentId: string, trait: string, value: number | null): Promise<ActionResult<null>> {
  const result = await api(subdomain, `/v1/arms/${id(armId)}/students/${id(studentId)}/ratings`, { method: "PUT", body: { trait, value } });
  return result.ok ? { ok: true, data: null } : fail(result);
}

export async function getRatingSettings(subdomain: string): Promise<RatingSettings | null> {
  return read<RatingSettings>(subdomain, "/v1/results/ratings");
}

export async function saveRatingSettings(subdomain: string, input: RatingSettings): Promise<ActionResult<null>> {
  const result = await api(subdomain, "/v1/results/ratings", { method: "PUT", body: input });
  return result.ok ? { ok: true, data: null } : fail(result);
}

export async function setPublished(subdomain: string, armId: string, publish: boolean): Promise<ActionResult<null>> {
  const result = await api(subdomain, `/v1/arms/${id(armId)}/published`, { method: "PUT", body: { published: publish } });
  return result.ok ? { ok: true, data: null } : fail(result);
}

export async function getReportCard(subdomain: string, studentId: string, termKey?: string): Promise<ReportCardData | null> {
  return read<ReportCardData>(subdomain, `/v1/students/${id(studentId)}/report-card`, { term: termKey });
}

export async function getReportTerms(subdomain: string, studentId: string): Promise<ReportTerm[] | null> {
  return read<ReportTerm[]>(subdomain, `/v1/students/${id(studentId)}/report-terms`);
}
