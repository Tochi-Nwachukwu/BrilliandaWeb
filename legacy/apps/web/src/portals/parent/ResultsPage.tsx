import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ordinal } from "@brillanda/shared-types";
import { Alert } from "../../shared/components/Alert";
import { Badge, gradeToneFromLetter } from "../../shared/components/Badge";
import { Button } from "../../shared/components/Button";
import { EmptyState } from "../../shared/components/EmptyState";
import { Icon } from "../../shared/components/Icon";
import { PageHeader } from "../../shared/components/PageHeader";
import { PageSpinner } from "../../shared/components/Spinner";
import { FilterTabs } from "../../shared/components/Tabs";
import { levelStyle } from "../../shared/theme/levels";
import { formatDate } from "../../shared/utils/time";
import { useChildren, useChildResults, useMarkSeen } from "./api";
import { ChildSwitcher, firstName, ParentReportCardDialog, SubjectPanel, termLabel, useSelectedChild } from "./parts";

export function ResultsPage() {
  const children = useChildren();
  const { child, select } = useSelectedChild(children.data);
  const results = useChildResults(child?.id);
  const markSeen = useMarkSeen();
  const [params, setParams] = useSearchParams();
  const [openSubject, setOpenSubject] = useState<number | null>(null);
  const [cardTerm, setCardTerm] = useState<string | null>(null);

  const terms = results.data?.terms ?? [];
  const term = terms.find((t) => `${t.term.id}` === params.get("term")) ?? terms[terms.length - 1];
  const unseen = term && !term.seen ? term.term.id : null;

  // Looking at a new result is what clears its "New" marker.
  useEffect(() => {
    // Runs once per new result: markSeen is left out on purpose, as it changes on every render.
    if (child && unseen) markSeen.mutate({ childId: child.id, termId: unseen });
  }, [child?.id, unseen]);

  if (children.isPending || (child && results.isPending)) return <PageSpinner />;
  if (children.error) return <Alert tone="danger">{children.error.message}</Alert>;
  if (results.error) return <Alert tone="danger">{results.error.message}</Alert>;
  if (!child || !term) return <EmptyState title="No results yet">Results appear here once the school publishes them.</EmptyState>;

  const name = firstName(child.fullName);
  const best = term.subjects.reduce((a, b) => (b.total > a.total ? b : a));
  const weakest = term.subjects.reduce((a, b) => (b.total < a.total ? b : a));
  const stats: [string, string, string, number][] = [
    ["Average", term.average.toFixed(1), "results", 2],
    [`Position in ${term.armName}`, `${ordinal(term.position)} of ${term.of}`, "classes", 0],
    ["Best subject", `${best.total}`, best.subjectName, 3],
    ["Needs attention", `${weakest.total}`, weakest.subjectName, 5],
  ];

  return (
    <>
      <PageHeader title={`${name}'s results`} actions={<ChildSwitcher children={children.data!} selected={child.id} onSelect={select} />}>
        Every published term, with the full breakdown for each subject.
      </PageHeader>

      <div className="mb-5">
        <FilterTabs
          label="Term"
          value={term.term.id + term.term.sessionName}
          onChange={(value) => {
            const t = terms.find((x) => x.term.id + x.term.sessionName === value)!;
            setParams((prev) => { const next = new URLSearchParams(prev); next.set("term", t.term.id); return next; });
          }}
          items={terms.map((t) => ({ value: t.term.id + t.term.sessionName, label: termLabel(t) + (t.seen ? "" : " (new)") }))}
        />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {stats.map(([label, value, note, level], i) => (
          <div key={label} className="grid animate-pop gap-2 rounded-[22px] p-[18px]" style={{ ...levelStyle(level), background: "var(--tint)", color: "var(--deep)", ["--d" as string]: `${i * 0.05}s` }}>
            <span className="text-[13.5px] opacity-85">{label}</span>
            <span className="text-[30px] font-medium leading-none tracking-[-0.03em] tabular-nums">{value}</span>
            {i > 1 && <span className="truncate text-[12.5px] opacity-85">{note}</span>}
          </div>
        ))}
      </div>

      <section className="rounded-3xl bg-surface p-5 shadow-raised sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-semibold tracking-[-0.02em]">{termLabel(term)}</h2>
            <p className="text-[13px] text-text-secondary">{term.armName}. Published {formatDate(term.publishedAt)}.</p>
          </div>
          <Button onClick={() => setCardTerm(term.term.id)}><Icon name="results" className="h-4 w-4" />Report card</Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-[14px]">
            <thead>
              <tr className="text-left text-xs text-text-muted">
                <th className="py-1.5 pr-2 font-medium">Subject</th>
                {term.subjects[0]!.scores.map((s) => (
                  <th key={s.component} className="hidden px-2 py-1.5 text-center font-medium sm:table-cell">{s.component}</th>
                ))}
                <th className="px-2 py-1.5 text-center font-medium">Total</th>
                <th className="py-1.5 pl-2 text-center font-medium">Grade</th>
              </tr>
            </thead>
            <tbody>
              {term.subjects.map((s, i) => (
                <tr key={s.subjectName} className="cursor-pointer border-t border-divider hover:bg-hover" onClick={() => setOpenSubject(i)}>
                  <td className="py-2.5 pr-2">
                    <button type="button" className="text-left font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" onClick={(e) => { e.stopPropagation(); setOpenSubject(i); }}>
                      {s.subjectName}
                    </button>
                  </td>
                  {s.scores.map((c) => (
                    <td key={c.component} className="hidden px-2 py-2.5 text-center tabular-nums text-text-secondary sm:table-cell">{c.isAbsent ? "ABS" : c.value ?? "—"}</td>
                  ))}
                  <td className="px-2 py-2.5 text-center font-semibold tabular-nums">{s.total}</td>
                  <td className="py-2.5 pl-2 text-center"><Badge tone={gradeToneFromLetter(s.grade)}>{s.grade}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <SubjectPanel
        subject={openSubject === null ? null : term.subjects[openSubject]!}
        term={term}
        childName={child.fullName}
        index={openSubject ?? 0}
        onClose={() => setOpenSubject(null)}
        onOpenCard={() => { setOpenSubject(null); setCardTerm(term.term.id); }}
      />
      <ParentReportCardDialog childId={child.id} termId={cardTerm} onClose={() => setCardTerm(null)} />
    </>
  );
}
