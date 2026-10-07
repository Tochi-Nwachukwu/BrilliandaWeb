import { EmptyState, PageHeader } from "@brillianda/ui";

export default function DevSubjects() {
  return (
    <div className="grid gap-5">
      <PageHeader title="Subjects" />
      <EmptyState title="Nothing here yet">Subjects arrive in batch 7.</EmptyState>
    </div>
  );
}
