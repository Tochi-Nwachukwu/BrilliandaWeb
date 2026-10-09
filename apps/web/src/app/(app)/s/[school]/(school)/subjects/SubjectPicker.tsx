"use client";

import { BAND_LABEL, preTicked, subjectCode, type Band, type CatalogueEntry } from "@brillianda/core";
import { Badge, Button, FilterTabs, Icon, cx } from "@brillianda/ui";
import { useState, useTransition, type KeyboardEvent } from "react";
import { FormError } from "@/components/auth/FormError";
import type { ActionResult } from "@/data/types";

type Group = { title: string; note?: string; entries: CatalogueEntry[] };

/** How the plan describes the 2025 lists: core, one-of sets, senior electives by group, optional. */
function groupsFor(entries: CatalogueEntry[], bands: Band[]): Group[] {
  const groups = new Map<string, Group>();
  const add = (title: string, entry: CatalogueEntry, note?: string) => {
    const group = groups.get(title) ?? { title, note, entries: [] };
    group.entries.push(entry);
    groups.set(title, group);
  };
  for (const entry of entries) {
    const roles = entry.offers.filter((o) => bands.includes(o.band)).map((o) => o.role);
    if (entry.tag === "legacy") add("Legacy subjects", entry, "Older classes still take these.");
    else if (entry.set) add(entry.set, entry, "One per student.");
    else if (roles.includes("core")) add("Core", entry, "Everyone takes these.");
    else if (roles.includes("science")) add("Senior science electives", entry);
    else if (roles.includes("humanities")) add("Senior humanities electives", entry);
    else if (roles.includes("business")) add("Senior business electives", entry);
    else add("Optional", entry);
  }
  const order = ["Core", "Nigerian language", "Religion", "Trade", "Senior science electives", "Senior humanities electives", "Senior business electives", "Optional", "Legacy subjects"];
  return [...groups.values()].sort((a, b) => order.indexOf(a.title) - order.indexOf(b.title));
}

const bandsText = (entry: CatalogueEntry, bands: Band[]) =>
  entry.offers
    .filter((o) => bands.includes(o.band))
    .map((o) => BAND_LABEL[o.band])
    .join(", ");

/** Pick subjects from the catalogue and add the school's own. Used for the first setup and to add more. */
export function SubjectPicker({
  catalogue,
  bands,
  existing,
  takenCodes,
  add,
  onAdded,
  first,
}: {
  catalogue: CatalogueEntry[];
  bands: Band[];
  /** Catalogue ids the school already has. */
  existing: string[];
  takenCodes: string[];
  add: (input: unknown) => Promise<ActionResult<{ added: number }>>;
  onAdded: (added: number) => void;
  /** The first setup pre-ticks the 2025 list; adding later starts empty. */
  first: boolean;
}) {
  const available = catalogue.filter((e) => !existing.includes(e.id) && e.offers.some((o) => bands.includes(o.band)));
  const [tab, setTab] = useState<"nerdc2025" | "legacy">("nerdc2025");
  const [ticked, setTicked] = useState<Set<string>>(() => new Set(first ? preTicked(available, bands) : []));
  const [custom, setCustom] = useState<{ name: string; code: string }[]>([]);
  const [draft, setDraft] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const shown = groupsFor(available.filter((e) => e.tag === tab), bands);
  const count = ticked.size + custom.length;
  const toggle = (id: string) =>
    setTicked((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const addCustom = () => {
    const name = draft.trim();
    if (!name || custom.some((c) => c.name.toLowerCase() === name.toLowerCase())) return;
    const taken = [...takenCodes, ...catalogue.filter((e) => ticked.has(e.id)).map((e) => e.code), ...custom.map((c) => c.code)];
    setCustom((list) => [...list, { name, code: subjectCode(name, taken) }]);
    setDraft("");
  };
  const submit = () => {
    setFailure(null);
    startTransition(async () => {
      const result = await add({ catalogueIds: [...ticked], custom });
      if (result.ok) onAdded(result.data.added);
      else setFailure(result.error);
    });
  };

  return (
    <div className="grid gap-5">
      <FilterTabs
        label="List"
        value={tab}
        onChange={setTab}
        items={[
          { value: "nerdc2025", label: "2025 curriculum", count: available.filter((e) => e.tag === "nerdc2025").length },
          { value: "legacy", label: "Legacy", count: available.filter((e) => e.tag === "legacy").length },
        ]}
      />
      {tab === "legacy" && <p className="text-sm text-text-secondary">Subjects the 2025 curriculum replaced. Classes that started on the old list, like SS 2 and SS 3 this session, can keep them.</p>}

      {shown.map((group) => (
        <fieldset key={group.title} className="grid gap-2">
          <legend className="mb-1 flex flex-wrap items-baseline gap-x-2 px-1">
            <span className="text-[15px] font-semibold">{group.title}</span>
            {group.note && <span className="text-[13px] text-text-secondary">{group.note}</span>}
          </legend>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {group.entries.map((entry) => {
              const on = ticked.has(entry.id);
              return (
                <li key={entry.id}>
                  <label
                    className={cx(
                      "flex min-h-[52px] cursor-pointer items-center gap-3 rounded-2xl px-3 py-2 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent",
                      on ? "bg-accent-soft" : "bg-sunken hover:bg-hover",
                    )}
                  >
                    <input type="checkbox" className="h-[18px] w-[18px] shrink-0 accent-[var(--color-accent)]" checked={on} onChange={() => toggle(entry.id)} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14.5px] font-medium leading-snug">{entry.name}</span>
                      <span className="block truncate text-[12px] text-text-secondary">{bandsText(entry, bands)}</span>
                    </span>
                    <span className="rounded-full bg-surface px-2 py-0.5 text-[11.5px] font-semibold text-text-secondary">{entry.code}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ))}
      {!shown.length && <p className="text-sm text-text-secondary">Nothing more to add from this list.</p>}

      <div className="grid gap-2">
        <p className="px-1 text-[15px] font-semibold">Your own subjects</p>
        <p className="px-1 text-[13px] text-text-secondary">Anything outside the catalogue, like Phonics or Verbal Reasoning. You choose their classes after.</p>
        <div className="flex gap-2">
          <label className="min-w-0 flex-1">
            <span className="sr-only">Subject name</span>
            <input
              className="min-h-[46px] w-full rounded-[14px] border-0 bg-sunken px-4 text-base focus:bg-surface focus:outline-hidden focus:ring-2 focus:ring-accent"
              placeholder="e.g. Phonics"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e: KeyboardEvent) => e.key === "Enter" && (e.preventDefault(), addCustom())}
            />
          </label>
          <Button variant="secondary" onClick={addCustom}>
            <Icon name="plus" className="h-4 w-4" />
            Add
          </Button>
        </div>
        {custom.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {custom.map((c) => (
              <li key={c.name} className="flex items-center gap-2 rounded-full bg-accent-soft py-1 pl-3.5 pr-1 text-sm font-medium text-accent">
                {c.name}
                <Badge>{c.code}</Badge>
                <button type="button" aria-label={`Remove ${c.name}`} onClick={() => setCustom((list) => list.filter((x) => x !== c))} className="grid h-8 w-8 place-items-center rounded-full hover:bg-surface">
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="sticky bottom-[92px] z-10 grid gap-2 rounded-[22px] bg-[color-mix(in_oklab,var(--color-surface)_92%,transparent)] p-3 shadow-float backdrop-blur-md md:bottom-3">
        <FormError message={failure} />
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-text-secondary" aria-live="polite">
            {count} {count === 1 ? "subject" : "subjects"} ticked
          </span>
          <Button loading={pending} disabled={!count} onClick={submit}>
            Add {count || ""} {count === 1 ? "subject" : "subjects"}
          </Button>
        </div>
      </div>
    </div>
  );
}
