import { EmptyState } from "@brillianda/ui/EmptyState";
import { PageHeader } from "@brillianda/ui/PageHeader";

/** A screen whose backend isn't built yet, while the app runs on the real API (DATA_SOURCE=api). */
export function NotConnected({ title }: { title: string }) {
  return (
    <div className="grid gap-4">
      <PageHeader title={title} />
      <EmptyState title="Not connected yet">This part of Brillianda is ready on our side and waiting for its backend. It will appear here once that is built.</EmptyState>
    </div>
  );
}
