import { ComingNext } from "@brillianda/ui";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Classes" };

// Filled in by a later batch (docs/migration-plan.md).
export default function ClassesPage() {
  return (
    <ComingNext title="Classes" portalName="Classes page">
      Here you’ll set up your classes and arms. The quick setup makes the whole list in one step.
    </ComingNext>
  );
}
