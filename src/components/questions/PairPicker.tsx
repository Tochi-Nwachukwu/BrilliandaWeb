"use client";

import type { Section } from "@brillianda/core/classes";
import { SECTION_SHORT, SECTIONS } from "@brillianda/core/timetable";
import { cx } from "@brillianda/ui/cx";
import { Icon } from "@brillianda/ui/Icon";
import { useEffect, useId, useRef, useState } from "react";
import { sectionOfName } from "@/components/ClassSelect";

export type Pair = { subjectId: string; subjectName: string; levelId: string; levelName: string; section?: Section };
export const pairKey = (p: { subjectId: string; levelId: string }) => `${p.subjectId}|${p.levelId}`;

/**
 * Subject and class, searchable. Owners and admins see every class, so the list is split by section
 * (Nursery, Primary, JSS, SSS) with a chip for each; a teacher sees only what they teach, usually one
 * section, and gets just the search.
 */
export function PairPicker({ pairs: given, value, onChange, label = "Subject and class", allLabel }: { pairs: Pair[]; value: string; onChange: (key: string) => void; label?: string; /** A first choice meaning every pair (the value ""). */ allLabel?: string }) {
  const id = useId();
  const pairs = given.map((p) => ({ ...p, section: p.section ?? sectionOfName(p.levelName) }));
  const box = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const current = pairs.find((p) => pairKey(p) === value);
  const present = SECTIONS.filter((s) => pairs.some((p) => p.section === s));
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
  const shown = pairs.filter((p) => (section === "all" || p.section === section) && words.every((w) => `${p.levelName} ${p.subjectName}`.toLowerCase().includes(w)));
  const groups = present.length > 1 ? [...present, undefined].map((s) => ({ section: s, items: shown.filter((p) => p.section === s) })).filter((g) => g.items.length) : [{ section: undefined, items: shown }];

  const pick = (p: Pair) => {
    onChange(pairKey(p));
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={box} className="relative">
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-[46px] w-full items-center gap-2 rounded-[14px] bg-sunken px-4 text-left text-base hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="min-w-0 flex-1 truncate">{current ? `${current.levelName} ${current.subjectName}` : (allLabel ?? "Choose a subject and class")}</span>
        <Icon name="chevron" className={cx("h-4 w-4 shrink-0 text-text-muted transition-transform", open ? "-rotate-90" : "rotate-90")} />
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 rounded-2xl bg-surface p-2 shadow-float">
          <input
            ref={search}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && shown[0]) {
                e.preventDefault();
                pick(shown[0]);
              }
            }}
            placeholder="Search, e.g. JSS 2 Maths"
            aria-label="Search subjects and classes"
            className="mb-2 block min-h-[42px] w-full rounded-xl border-0 bg-sunken px-3 text-base focus:outline-hidden focus:ring-2 focus:ring-accent"
          />
          {present.length > 1 && (
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
              <button type="button" role="option" aria-selected={!value} onClick={() => (onChange(""), setOpen(false))} className={cx("block w-full rounded-xl px-2.5 py-2 text-left text-[15px] hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent", !value && "bg-accent-soft font-semibold text-accent")}>
                {allLabel}
              </button>
            )}
            {groups.map((g) => (
              <div key={g.section ?? "other"} role="group" aria-label={g.section ? SECTION_SHORT[g.section] : undefined}>
                {present.length > 1 && <p className="px-2.5 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-text-muted">{g.section ? SECTION_SHORT[g.section] : "Other"}</p>}
                {g.items.map((p) => {
                  const selected = pairKey(p) === value;
                  return (
                    <button
                      key={pairKey(p)}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => pick(p)}
                      className={cx("block w-full rounded-xl px-2.5 py-2 text-left text-[15px] hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent", selected && "bg-accent-soft font-semibold text-accent")}
                    >
                      {p.levelName} {p.subjectName}
                    </button>
                  );
                })}
              </div>
            ))}
            {shown.length === 0 && <p className="px-2.5 py-3 text-sm text-text-secondary">Nothing matches “{query}”.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
