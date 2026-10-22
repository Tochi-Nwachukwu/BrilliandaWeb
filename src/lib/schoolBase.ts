// Where a school's pages start in this visit's address. On the school's own address
// (surebloom.brillianda.com) they start at the root: /students. Anywhere else (localhost, a
// vercel.app preview) at /s/<school>: /s/surebloom/students. proxy.ts says which it is with a
// header only it can set. Browser components get the same value from <SchoolBase> (useSchoolBase).
import "server-only";
import { headers } from "next/headers";

/** Set only by proxy.ts: the school whose own address this request came in on. */
export const SCHOOL_HEADER = "x-brillianda-school";

/** "" on the school's own address, else "/s/<school>". Add paths to it: `${base}/students`. Its home is `base || "/"`. */
export async function schoolBase(school: string): Promise<string> {
  return (await headers()).get(SCHOOL_HEADER) === school ? "" : `/s/${school}`;
}

/** The same, for a route handler. */
export function schoolBaseOf(request: Request, school: string): string {
  return request.headers.get(SCHOOL_HEADER) === school ? "" : `/s/${school}`;
}
