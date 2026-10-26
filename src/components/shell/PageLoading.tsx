// What a dashboard shows the moment a tab is tapped, while the page's data comes from the backend:
// the sidebar stays, and the page area is a faint outline of a heading and a few cards. Each
// dashboard's loading.tsx renders it, so it appears at once instead of the old page staying put.
export function PageLoading() {
  return (
    <div role="status" aria-label="Loading" className="grid gap-4 motion-safe:animate-pulse">
      <div className="mb-2">
        <div className="h-9 w-56 max-w-full rounded-xl bg-sunken sm:h-11" />
        <div className="mt-3 h-4 w-80 max-w-full rounded-lg bg-sunken" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-3xl bg-surface shadow-raised" />
        ))}
      </div>
      <div className="h-64 rounded-3xl bg-surface shadow-raised" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
