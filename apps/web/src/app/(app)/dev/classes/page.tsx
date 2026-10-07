import { EmptyState, PageHeader } from "@brillianda/ui";

export default function DevClasses() {
  return (
    <div className="grid gap-5">
      <PageHeader title="Classes" />
      <EmptyState title="Nothing here yet">Classes and arms arrive in batch 6.</EmptyState>
    </div>
  );
}
