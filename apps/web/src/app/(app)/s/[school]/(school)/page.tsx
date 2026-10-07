import { ComingNext } from "@brillianda/ui";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Home" };

// Home with the setup checklist arrives in batch 5 (docs/migration-plan.md).
export default function SchoolHome() {
  return <ComingNext title="Home" portalName="Home page" />;
}
