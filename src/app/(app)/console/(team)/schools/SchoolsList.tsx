"use client";

import { matchesSearch } from "@brillianda/core/students";
import { Badge } from "@brillianda/ui/Badge";
import { EmptyState } from "@brillianda/ui/EmptyState";
import { Icon } from "@brillianda/ui/Icon";
import { SelectField, TextField } from "@brillianda/ui/TextField";
import Link from "next/link";
import { useState } from "react";
import type { ConsoleSchool } from "@/data/types";
import { plural, timeAgo } from "@/lib/time";

/** Every school, searchable by name, address or owner, and filtered by status. */
export function SchoolsList({ schools, now, root }: { schools: ConsoleSchool[]; now: number; root: string }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "suspended">("all");
  const shown = schools.filter(
    (s) => (status === "all" || s.status === status) && (!query.trim() || matchesSearch({ fullName: `${s.name} ${s.subdomain} ${s.owner?.fullName ?? ""} ${s.owner?.email ?? ""}`, admissionNo: "" }, query)),
  );
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 rounded-3xl bg-surface p-5 shadow-raised sm:grid-cols-[minmax(0,1fr)_12rem]">
        <TextField label="Search schools" type="search" placeholder="Name, address or owner" value={query} onChange={(e) => setQuery(e.target.value)} />
        <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="suspended">Paused</option>
        </SelectField>
      </div>
      <p className="text-sm text-text-secondary" aria-live="polite">
        {plural(shown.length, "school")}
      </p>
      {shown.length === 0 ? (
        <div className="rounded-3xl bg-surface p-6 shadow-raised">
          <EmptyState title="No schools match">Try another name, or show all statuses.</EmptyState>
        </div>
      ) : (
        <ul className="grid gap-0.5 rounded-3xl bg-surface p-2 shadow-raised">
          {shown.map((s) => (
            <li key={s.subdomain}>
              <Link
                href={`/console/schools/${s.subdomain}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl p-3 hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent md:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_minmax(0,1fr)_auto]"
              >
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <b className="truncate font-semibold">{s.name}</b>
                    {s.status === "suspended" && <Badge tone="warning">Paused</Badge>}
                  </span>
                  <span className="block truncate text-[13px] text-text-secondary">{s.subdomain}.{root}</span>
                </span>
                <span className="hidden min-w-0 text-[13px] md:block">
                  <span className="block truncate">{s.owner?.fullName ?? "No owner"}</span>
                  <span className="block truncate text-text-secondary">{s.owner?.email}</span>
                </span>
                <span className="hidden text-[13px] text-text-secondary md:block">
                  {plural(s.students, "student")} · setup {s.setupDone}/{s.setupTotal}
                  <span className="block">{s.createdAt ? `Joined ${timeAgo(s.createdAt, now)}` : "Sample school"}</span>
                </span>
                <Icon name="chevron" className="h-4 w-4 text-text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
