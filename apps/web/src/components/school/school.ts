import "server-only";
import { notFound } from "next/navigation";
import { getSchoolBySubdomain } from "@/data/school";
import type { SchoolSummary } from "@/data/types";

/** The school a page is on, from the route. 404 if there is none (the layout already checked). */
export async function schoolFromParams(params: Promise<{ school: string }>): Promise<SchoolSummary> {
  const { school } = await params;
  const found = await getSchoolBySubdomain(school);
  if (!found) notFound();
  return found;
}
