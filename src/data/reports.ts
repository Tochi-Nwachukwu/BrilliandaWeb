// Results for the school (batch 15; docs/data-contract.md). Screens import from here, never from fake/.
import "server-only";
import type { RatingSettings } from "@brillianda/core/results";
import * as impl from "./fake/reports";
import { LIVE } from "./source";
import type { Broadsheet, ClassReports, ReportCardData, ReportTerm } from "./types";

/** A class's broadsheet this term. Admins, or that class's form teacher (read only). */
export function getBroadsheet(subdomain: string, armId: string): Promise<Broadsheet | null> {
  return impl.getBroadsheet(subdomain, armId);
}

/** Remarks and behaviour ratings for a class. Admins, or that class's form teacher. */
export function getClassReports(subdomain: string, armId: string): Promise<ClassReports | null> {
  return impl.getClassReports(subdomain, armId);
}

/** One student's report card for a term (default: the open one). Admins, or their form teacher. */
export function getReportCard(subdomain: string, studentId: string, termKey?: string): Promise<ReportCardData | null> {
  return impl.getReportCard(subdomain, studentId, termKey);
}

/** Every term a student has results in, newest first. Owners and admins. */
export function getReportTerms(subdomain: string, studentId: string): Promise<ReportTerm[] | null> {
  if (LIVE) return Promise.resolve(null);
  return impl.getReportTerms(subdomain, studentId);
}

/** Whether the school rates behaviour, and which traits. Owners and admins. */
export function getRatingSettings(subdomain: string): Promise<RatingSettings | null> {
  return impl.getRatingSettings(subdomain);
}
