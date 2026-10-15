// Students (docs/data-contract.md). Screens import from here, never from fake/.
import "server-only";
import { LIVE } from "./api/client";
import * as live from "./api/students";
import * as fake from "./fake/students";
import type { AdmissionSettings, StudentDetail, StudentsList } from "./types";

// The API where it has endpoints (DATA_SOURCE=api), else sample data.
const impl = LIVE ? live : fake;

/** Every student not deleted, the classes they can sit in, and the next admission number. */
export function listStudents(subdomain: string): Promise<StudentsList | null> {
  return impl.listStudents(subdomain);
}

/** One student with their guardian (and siblings), class history and changes; null if not found. */
export function getStudent(subdomain: string, id: string): Promise<StudentDetail | null> {
  return impl.getStudent(subdomain, id);
}

/** The school's admission number format, its next number and a preview. */
export function getAdmissionSettings(subdomain: string): Promise<AdmissionSettings | null> {
  return impl.getAdmissionSettings(subdomain);
}
