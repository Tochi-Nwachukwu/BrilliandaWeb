import { useState } from "react";
import { Alert } from "../../shared/components/Alert";
import { Button } from "../../shared/components/Button";
import { EmptyState } from "../../shared/components/EmptyState";
import { Icon } from "../../shared/components/Icon";
import { PageHeader } from "../../shared/components/PageHeader";
import { PageSpinner } from "../../shared/components/Spinner";
import { FilterTabs } from "../../shared/components/Tabs";
import { useSchools } from "./api";
import { CreateSchoolDialog, SchoolCard, SchoolPanel, schoolState, type SchoolState } from "./schools";

type Filter = "ALL" | SchoolState;

export function SchoolsPage() {
  const schools = useSchools();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  if (schools.isPending) return <PageSpinner />;
  if (schools.error) return <Alert tone="danger">{schools.error.message}</Alert>;

  const all = schools.data;
  const count = (state: SchoolState) => all.filter((s) => schoolState(s) === state).length;
  const tabs = [
    { value: "ALL" as const, label: "All", count: all.length },
    { value: "ACTIVE" as const, label: "Active", count: count("ACTIVE") },
    { value: "TRIAL" as const, label: "On trial", count: count("TRIAL") },
    { value: "SUSPENDED" as const, label: "Suspended", count: count("SUSPENDED") },
  ].filter((tab) => tab.value === "ALL" || tab.count > 0);
  const words = query.trim().toLowerCase();
  const shown = all.filter(
    (s) => (filter === "ALL" || schoolState(s) === filter) && (!words || `${s.name} ${s.city ?? ""}`.toLowerCase().includes(words)),
  );

  return (
    <>
      <PageHeader
        title="Schools"
        actions={
          <Button onClick={() => setCreating(true)}>
            <Icon name="plus" className="h-4 w-4" />
            Create a school
          </Button>
        }
      >
        Every school on Brillanda. Open one to see its details, extend a trial, or suspend and restore access.
      </PageHeader>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs label="Show" items={tabs} value={filter} onChange={setFilter} />
        <label className="relative w-full max-w-sm">
          <span className="sr-only">Search schools</span>
          <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-text-muted" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search schools or towns"
            className="min-h-[46px] w-full rounded-full border-0 bg-raise pl-11 pr-4 text-base shadow-raised focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
      </div>

      {shown.length ? (
        <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
          {shown.map((school, index) => (
            <li key={school.id} className="grid">
              <SchoolCard school={school} index={index} onOpen={setOpenId} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No schools match">{words ? `Nothing called “${query.trim()}”. Check the spelling or clear the search.` : "Try another filter."}</EmptyState>
      )}

      <SchoolPanel school={all.find((s) => s.id === openId) ?? null} onClose={() => setOpenId(null)} />
      <CreateSchoolDialog open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
