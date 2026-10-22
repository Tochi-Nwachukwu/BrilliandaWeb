"use client";

import { createContext, useContext, type ReactNode } from "react";

// Where the school's pages start in this visit's address (src/lib/schoolBase.ts), for browser
// components. The school's layout provides it.
const Base = createContext<{ school: string; base: string } | null>(null);

export function SchoolBase({ school, base, children }: { school: string; base: string; children: ReactNode }) {
  return <Base.Provider value={{ school, base }}>{children}</Base.Provider>;
}

/** "" on the school's own address, else "/s/<school>". Its home is `base || "/"`. */
export function useSchoolBase(school: string): string {
  const value = useContext(Base);
  return value && value.school === school ? value.base : `/s/${school}`;
}
