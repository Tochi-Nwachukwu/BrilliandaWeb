import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { ArmSummary } from "@brillanda/shared-types";
import { Alert } from "../../shared/components/Alert";
import { EmptyState } from "../../shared/components/EmptyState";
import { Icon } from "../../shared/components/Icon";
import { PageHeader } from "../../shared/components/PageHeader";
import { Ring } from "../../shared/components/Ring";
import { PageSpinner } from "../../shared/components/Spinner";
import { FilterTabs } from "../../shared/components/Tabs";
import { cx } from "../../shared/utils/cx";
import { plural } from "../../shared/utils/time";
import { SECTIONS, useArms } from "./api";
import { armCategory, ArmCard, subjectsDone, type ArmCategory } from "./parts";

type Filter = "ALL" | ArmCategory;
const LEVEL_NAMES = ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"];

export function ClassesPage() {
  const arms = useArms();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>("ALL");
  const [openSection, setOpenSection] = useState<string | null>(null);
  const level = params.get("level");

  if (arms.isPending) return <PageSpinner />;
  if (arms.error) return <Alert tone="danger">{arms.error.message}</Alert>;

  const all = arms.data;
  const count = (c: ArmCategory) => all.filter((a) => armCategory(a) === c).length;
  const tabs = [
    { value: "ALL" as const, label: "All", count: all.length },
    { value: "READY" as const, label: "Ready", count: count("READY") },
    { value: "PROGRESS" as const, label: "In progress", count: count("PROGRESS") },
    { value: "ATTENTION" as const, label: "Needs you", count: count("ATTENTION") },
    { value: "PUBLISHED" as const, label: "Published", count: count("PUBLISHED") },
  ].filter((t) => t.value === "ALL" || t.count > 0);
  const shown = all.filter((a) => (filter === "ALL" || armCategory(a) === filter) && (level === null || a.classOrder === Number(level)));
  const grouped = filter === "ALL" && level === null;
  const ready = count("READY"), attention = count("ATTENTION");

  return (
    <>
      <PageHeader title="Classes">
        {ready ? `${plural(ready, "class is", "classes are")} ready to publish` : "No class is ready to publish yet"}
        {attention ? `, and ${plural(attention, "needs", "need")} your attention.` : "."}
      </PageHeader>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs label="Show" items={tabs} value={filter} onChange={setFilter} />
        <label className="relative">
          <span className="sr-only">Class level</span>
          <select
            value={level ?? ""}
            onChange={(e) => setParams(e.target.value ? { level: e.target.value } : {})}
            className="min-h-[46px] appearance-none rounded-full border-0 bg-raise pl-4 pr-10 text-sm font-medium shadow-raised focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">Every level</option>
            {LEVEL_NAMES.map((name, order) => (
              <option key={name} value={order}>{name}</option>
            ))}
          </select>
          <Icon name="chevron" className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rotate-90 text-text-secondary" />
        </label>
      </div>

      {grouped ? (
        <div className="grid grid-flow-row-dense gap-4 lg:grid-cols-2">
          {SECTIONS.map((section) => {
            const inSection = all.filter((a) => (section.orders as readonly number[]).includes(a.classOrder));
            const open = openSection === section.id;
            return [
              <SectionCard key={section.id} section={section} arms={inSection} open={open} onToggle={() => setOpenSection(open ? null : section.id)} />,
              open && <SectionBody key={`${section.id}-body`} section={section} arms={inSection} />,
            ];
          })}
        </div>
      ) : shown.length ? (
        <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
          {shown.map((arm, i) => (
            <li key={arm.id} className="grid">
              <ArmCard arm={arm} index={i} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="No classes here">Try another filter or level.</EmptyState>
      )}
    </>
  );
}

type Section = (typeof SECTIONS)[number];

function SectionCard({ section, arms, open, onToggle }: { section: Section; arms: ArmSummary[]; open: boolean; onToggle: () => void }) {
  const done = arms.reduce((n, a) => n + subjectsDone(a), 0);
  const total = arms.reduce((n, a) => n + a.subjects.length, 0);
  const students = arms.reduce((n, a) => n + a.studentCount, 0);
  const ready = arms.filter((a) => armCategory(a) === "READY").length;
  const attention = arms.filter((a) => armCategory(a) === "ATTENTION").length;
  const published = arms.filter((a) => armCategory(a) === "PUBLISHED").length;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      className={cx(
        "relative isolate grid animate-pop gap-5 overflow-hidden rounded-[28px] bg-surface p-6 text-left shadow-raised transition-[transform,box-shadow] duration-300 hover:-translate-y-[3px] hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        open && "ring-2 ring-accent",
      )}
    >
      <span aria-hidden className="absolute -bottom-28 -right-16 -z-10 h-64 w-64 rounded-full opacity-70 transition-transform duration-700" style={{ background: `var(--level-${section.tintLevel + 1}-tint)`, transform: open ? "scale(1.15)" : undefined }} />
      <span className="flex items-start justify-between gap-4">
        <span>
          <span className="block text-[28px] font-medium leading-tight tracking-[-0.035em]">{section.name}</span>
          <span className="mt-1.5 block text-sm text-text-secondary">{section.range}. {plural(arms.length, "class", "classes")}, {students} students.</span>
        </span>
        <Ring value={done / Math.max(1, total)} label={`${Math.round((done / Math.max(1, total)) * 100)}%`} className="h-20 w-20" />
      </span>
      <span className="grid gap-2.5">
        {section.orders.map((order) => {
          const inLevel = arms.filter((a) => a.classOrder === order);
          const d = inLevel.reduce((n, a) => n + subjectsDone(a), 0);
          const t = inLevel.reduce((n, a) => n + a.subjects.length, 0);
          return (
            <span key={order} className="grid grid-cols-[4.4rem_minmax(0,1fr)_3rem] items-center gap-3 text-[13.5px]">
              <span className="flex items-center gap-2 font-semibold">
                <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: `var(--level-${order + 1}-mid)` }} />
                {LEVEL_NAMES[order]}
              </span>
              <span aria-hidden className="relative block h-[7px] overflow-hidden rounded-full bg-sunken">
                <span className="absolute inset-y-0 left-0 animate-grow rounded-full" style={{ width: `${(d / Math.max(1, t)) * 100}%`, background: `var(--level-${order + 1}-mid)` }} />
              </span>
              <span className="text-right text-[12.5px] tabular-nums text-text-secondary">{d}/{t}</span>
            </span>
          );
        })}
      </span>
      <span className="flex flex-wrap items-center justify-between gap-2.5">
        <span className="flex flex-wrap gap-3.5 text-[12.5px] font-medium text-text-secondary">
          {ready > 0 && <span className="flex items-center gap-1.5"><span aria-hidden className="h-[7px] w-[7px] rounded-full bg-success" />{ready} ready</span>}
          {attention > 0 && <span className="flex items-center gap-1.5"><span aria-hidden className="h-[7px] w-[7px] rounded-full bg-danger" />{attention} {attention === 1 ? "needs" : "need"} you</span>}
          {published > 0 && <span className="flex items-center gap-1.5"><span aria-hidden className="h-[7px] w-[7px] rounded-full bg-text-primary" />{published} published</span>}
          {!ready && !attention && !published && <span>Scores coming in</span>}
        </span>
        <span className={cx("inline-flex h-[38px] items-center gap-1.5 rounded-full pl-4 pr-3 text-[13.5px] font-medium transition-colors", open ? "bg-primary text-primary-text" : "bg-sunken")}>
          {open ? "Hide classes" : "Show classes"}
          <Icon name="chevron" className={cx("h-4 w-4 transition-transform duration-300", open && "rotate-90")} />
        </span>
      </span>
    </button>
  );
}

/** A section's classes, one column per level, each holding its arms. */
function SectionBody({ section, arms }: { section: Section; arms: ArmSummary[] }) {
  return (
    <div role="region" aria-label={`${section.name} classes`} className="grid animate-pop gap-4 rounded-[28px] bg-[color-mix(in_oklab,var(--color-surface)_55%,transparent)] p-4 shadow-[inset_0_0_0_1px_var(--color-border)] sm:p-5 lg:col-span-2 lg:grid-cols-3">
      {section.orders.map((order) => {
        const inLevel = arms.filter((a) => a.classOrder === order);
        return (
          <div key={order} className="grid content-start gap-3">
            <div className="flex items-baseline justify-between gap-2 px-1.5">
              <b className="text-lg font-medium tracking-[-0.02em]">{LEVEL_NAMES[order]}</b>
              <span className="text-[12.5px] text-text-secondary">{plural(inLevel.length, "class", "classes")}, {inLevel.reduce((n, a) => n + a.studentCount, 0)} students</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {inLevel.map((arm, i) => (
                <ArmCard key={arm.id} arm={arm} index={i} compact />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
