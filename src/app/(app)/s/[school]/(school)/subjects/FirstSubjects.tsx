"use client";

import type { Band, CatalogueEntry } from "@brillianda/core";
import { PageHeader, toast } from "@brillianda/ui";
import { useRouter } from "next/navigation";
import type { ActionResult } from "@/data/types";
import { SubjectPicker } from "./SubjectPicker";

/** The first pick (plan: the 2025 list pre-ticked for each section the school runs). */
export function FirstSubjects({ catalogue, bands, add }: { catalogue: CatalogueEntry[]; bands: Band[]; add: (input: unknown) => Promise<ActionResult<{ added: number }>> }) {
  const router = useRouter();
  return (
    <div className="grid gap-5">
      <PageHeader title="Choose your subjects">
        {bands.length
          ? "The 2025 curriculum for your classes is ticked. Untick what you don’t teach, add optional, legacy or your own subjects. Each one goes to its usual classes; you can change that after."
          : "The national list starts at Primary 1, so add your own subjects for your classes. You choose which classes take them after."}
      </PageHeader>
      <SubjectPicker
        catalogue={catalogue}
        bands={bands}
        existing={[]}
        takenCodes={[]}
        add={add}
        first
        onAdded={(added) => {
          toast(`${added} subjects added`);
          router.refresh();
        }}
      />
    </div>
  );
}
