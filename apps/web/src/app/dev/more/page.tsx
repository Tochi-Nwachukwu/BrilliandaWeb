import { EmptyState, PageHeader } from "@brillianda/ui";

export default function DevMore() {
  return (
    <div className="grid gap-5">
      <PageHeader title="More" />
      <EmptyState title="Nothing here yet">Settings, sessions and terms, and admins live here.</EmptyState>
    </div>
  );
}
