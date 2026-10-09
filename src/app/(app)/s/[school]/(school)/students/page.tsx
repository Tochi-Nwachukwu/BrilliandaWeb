import { ComingNext } from "@brillianda/ui";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Students" };

// Filled in by a later batch (docs/migration-plan.md).
export default function StudentsPage() {
  return (
    <ComingNext title="Students" portalName="Students page">
      Here you’ll add students one by one or import them from a spreadsheet, and move them between arms.
    </ComingNext>
  );
}
