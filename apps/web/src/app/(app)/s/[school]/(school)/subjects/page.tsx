import { ComingNext } from "@brillianda/ui";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Subjects" };

// Filled in by a later batch (docs/migration-plan.md).
export default function SubjectsPage() {
  return (
    <ComingNext title="Subjects" portalName="Subjects page">
      Here you’ll pick the subjects you teach from the national list, and add your own.
    </ComingNext>
  );
}
