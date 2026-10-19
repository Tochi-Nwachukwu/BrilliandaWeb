// Teachers, what they teach, and the daily register (batch 11; docs/data-contract.md). Screens
// import from here, never from fake/.
import "server-only";
import * as live from "./api/teaching";
import * as fake from "./fake/teaching";
import { LIVE } from "./source";

// The API where it has endpoints (DATA_SOURCE=api), else sample data.
const impl = LIVE ? live : fake;
import type { Register, RegistersToday, SubjectClass, TeacherHome, TeachersPage } from "./types";

/** More › Teachers: every teacher (and open invite), with their form classes and subject classes. Owners and admins. */
export function getTeachersPage(subdomain: string): Promise<TeachersPage | null> {
  return impl.getTeachersPage(subdomain);
}

/** One arm's register for a day (default: the latest school day). Admins, or that arm's form teacher. */
export function getRegister(subdomain: string, armId: string, date?: string): Promise<Register | null> {
  return impl.getRegister(subdomain, armId, date);
}

/** A signed-in teacher's form classes and subject classes. */
export function getTeacherHome(subdomain: string): Promise<TeacherHome | null> {
  return impl.getTeacherHome(subdomain);
}

/** The students in one subject class, for its teacher (or an admin). */
export function getSubjectClass(subdomain: string, armId: string, subjectId: string): Promise<SubjectClass | null> {
  return impl.getSubjectClass(subdomain, armId, subjectId);
}

/** Home's register card for admins: how many of today's registers are in, and which are missing. */
export function getRegistersToday(subdomain: string): Promise<RegistersToday | null> {
  return impl.getRegistersToday(subdomain);
}
