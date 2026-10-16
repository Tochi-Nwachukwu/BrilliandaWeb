import { EmptyState } from "@brillianda/ui/EmptyState";

export default function NotFound() {
  return (
    <div className="rounded-3xl bg-surface p-6 shadow-raised">
      <EmptyState title="Not found">This page isn’t here, or it isn’t yours to see.</EmptyState>
    </div>
  );
}
