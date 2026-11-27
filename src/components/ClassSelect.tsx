"use client";

import type { Section } from "@brillianda/core/classes";
import { SECTION_SHORT, SECTIONS } from "@brillianda/core/timetable";
import { cx } from "@brillianda/ui/cx";
import { Icon } from "@brillianda/ui/Icon";
import { useEffect, useId, useRef, useState } from "react";

export type ClassChoice = { id: string; label: string; section?: Section };

/** The section a class belongs to, from its name, for lists that don't carry it. */
export function sectionOfName(name: string): Section | undefined {
  const n = name.trim().toLowerCase();
  if (/^(creche|crèche|pre-?nursery|nursery|kg\b|kindergarten|reception|playgroup)/.test(n)) return "preschool";
  if (/^(primary|basic|grade\s*\d|pri\b)/.test(n)) return "primary";
  if (/^(jss|js\b|junior)/.test(n)) return "junior";
  if (/^(sss|ss\b|senior)/.test(n)) return "senior";
  return undefined;
}

/**
 * A class picker that stays short: searchable, split into Nursery, Primary, JSS and SSS (chips and
 * headings) when the school has more than one of them. Use it in place of a long class dropdown.
 */
export function ClassSelect({
  items,
  value,
  onChange,
  label,
  placeholder = "Choose a class",
  allLabel,
  error,
  className,
  disabled,
}: {
  items: ClassChoice[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  placeholder?: string;
  /** A first choice meaning none or every class (the value ""). */
  allLabel?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const all = items.map((i) => ({ ...i, section: i.section ?? sectionOfName(i.label) }));
  const current = all.find((i) => i.id === value);
  const present = SECTIONS.filter((s) => all.some((i) => i.section === s));
  const [section, setSection] = useState<Section | "all">(current?.section ?? "all");

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !box.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = all.filter((i) => (section === "all" || i.section === section) && words.every((w) => i.label.toLowerCase().includes(w)));
  const split = present.length > 1;
  const groups = split ? [...present, undefined].map((s) => ({ section: s, items: shown.filter((i) => i.section === s) })).filter((g) => g.items.length) : [{ section: undefined, items: shown }];

  const pick = (next: string) => {
    onChange(next);
    setOpen(false);
    setQuery("");
  };
  const option = (selected: boolean) => cx("block w-full rounded-xl px-2.5 py-2 text-left text-[15px] hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent", selected && "bg-accent-soft font-semibold text-accent");

  return (
    <div ref={box} className={cx("relative", className)}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cx(
          "flex min-h-[46px] w-full items-center gap-2 rounded-[14px] px-4 text-left text-base focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60",
          error ? "bg-danger-bg ring-2 ring-danger" : "bg-sunken hover:bg-hover",
        )}
      >
        <span className="min-w-0 flex-1 truncate">{current ? current.label : value === "" && allLabel ? allLabel : placeholder}</span>
        <Icon name="chevron" className={cx("h-4 w-4 shrink-0 text-text-muted transition-transform", open ? "-rotate-90" : "rotate-90")} />
      </button>
      {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}

      {open && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 min-w-[14rem] rounded-2xl bg-surface p-2 shadow-float">
          <input
            ref={search}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && shown[0]) {
                e.preventDefault();
                pick(shown[0].id);
              }
            }}
            placeholder="Search, e.g. JSS 2 Gold"
            aria-label={`Search ${label.toLowerCase()}`}
            className="mb-2 block min-h-[42px] w-full rounded-xl border-0 bg-sunken px-3 text-base focus:outline-hidden focus:ring-2 focus:ring-accent"
          />
          {split && (
            <div role="group" aria-label="Section" className="mb-2 flex flex-wrap gap-1.5">
              {(["all", ...present] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={section === s}
                  onClick={() => setSection(s)}
                  className={cx("min-h-[34px] rounded-full px-3 text-[13px] font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent", section === s ? "bg-primary text-primary-text" : "bg-raise shadow-raised hover:bg-hover")}
                >
                  {s === "all" ? "All" : SECTION_SHORT[s]}
                </button>
              ))}
            </div>
          )}
          <div role="listbox" aria-label={label} className="max-h-72 overflow-y-auto">
            {allLabel && !words.length && (
              <button type="button" role="option" aria-selected={!value} onClick={() => pick("")} className={option(!value)}>
                {allLabel}
              </button>
            )}
            {groups.map((g) => (
              <div key={g.section ?? "other"} role="group" aria-label={g.section ? SECTION_SHORT[g.section] : undefined}>
                {split && <p className="px-2.5 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{g.section ? SECTION_SHORT[g.section] : "Other"}</p>}
                {g.items.map((i) => (
                  <button key={i.id} type="button" role="option" aria-selected={i.id === value} onClick={() => pick(i.id)} className={option(i.id === value)}>
                    {i.label}
                  </button>
                ))}
              </div>
            ))}
            {shown.length === 0 && <p className="px-2.5 py-3 text-sm text-text-secondary">Nothing matches “{query}”.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
