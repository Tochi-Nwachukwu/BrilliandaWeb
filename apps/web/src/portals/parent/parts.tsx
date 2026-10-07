import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { create } from "zustand";
import type { ChildSummary, SubjectResult, TermResult } from "@brillanda/shared-types";
import { Alert } from "../../shared/components/Alert";
import { Badge, gradeToneFromLetter } from "../../shared/components/Badge";
import { Dialog, PanelTitle, SidePanel } from "../../shared/components/Overlay";
import { ReportCardView } from "../../shared/components/ReportCardView";
import { PageSpinner } from "../../shared/components/Spinner";
import { levelStyle } from "../../shared/theme/levels";
import { cx } from "../../shared/utils/cx";
import { useParentReportCard } from "./api";

/** The last child chosen, so moving between pages from the menu keeps the same child. */
const useChosenChild = create<{ id: string | null; set: (id: string) => void }>()((set) => ({ id: null, set: (id) => set({ id }) }));

/** For tests: forget the last chosen child. */
export const forgetChosenChild = () => useChosenChild.setState({ id: null });

/** The child being looked at: from the address (?child=) when a link names one, else the last chosen. */
export function useSelectedChild(children: ChildSummary[] | undefined) {
  const [params, setParams] = useSearchParams();
  const remembered = useChosenChild();
  const fromAddress = params.get("child");
  const wanted = fromAddress ?? remembered.id;
  useEffect(() => {
    if (fromAddress && fromAddress !== useChosenChild.getState().id) useChosenChild.getState().set(fromAddress);
  }, [fromAddress]);
  const child = children?.find((c) => c.id === wanted) ?? children?.[0];
  const select = (id: string) => {
    remembered.set(id);
    setParams((prev) => { const next = new URLSearchParams(prev); next.set("child", id); next.delete("term"); return next; });
  };
  return { child, select };
}

export const firstName = (fullName: string) => fullName.split(" ")[0]!;
export const initials = (fullName: string) => fullName.split(" ").map((w) => w[0]).join("").slice(0, 2);

/** One pill per child. A red dot marks a child with results the parent hasn't opened yet. */
export function ChildSwitcher({ children, selected, onSelect, onDark = false }: { children: ChildSummary[]; selected?: string; onSelect: (id: string) => void; onDark?: boolean }) {
  if (children.length < 2) return null;
  return (
    <div role="group" aria-label="Child" className="flex flex-wrap gap-1.5">
      {children.map((c) => {
        const active = c.id === selected;
        const isNew = c.latest && !c.latest.seen;
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={active}
            onClick={() => onSelect(c.id)}
            className={cx(
              "inline-flex h-10 items-center gap-2 rounded-full py-0 pl-1.5 pr-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              active ? "bg-primary text-primary-text" : onDark ? "bg-[color-mix(in_oklab,var(--hero-text)_10%,transparent)] text-[color:var(--hero-text)]" : "bg-raise shadow-raised",
            )}
          >
            <span aria-hidden className="grid h-[30px] w-[30px] place-items-center rounded-full text-[11.5px] font-semibold" style={{ ...levelStyle(c.classOrder), background: "var(--tint)", color: "var(--deep)" }}>
              {initials(c.fullName)}
            </span>
            {firstName(c.fullName)}
            {isNew && <span className="h-2 w-2 rounded-full bg-danger" aria-label="New results" />}
          </button>
        );
      })}
    </div>
  );
}

export { termLabel, TrendChart } from "../../shared/components/TrendChart";
import { termLabel } from "../../shared/components/TrendChart";

/** One subject, broken down into its assessments. */
export function SubjectPanel({ subject, term, childName, index, onClose, onOpenCard }: { subject: SubjectResult | null; term: TermResult; childName: string; index: number; onClose: () => void; onOpenCard: () => void }) {
  if (!subject) return null;
  const level = levelStyle(index);
  return (
    <SidePanel open onClose={onClose} label={subject.subjectName}>
      <PanelTitle icon="results" title={subject.subjectName} tint={{ bg: level["--tint"], fg: level["--deep"] }}>
        {firstName(childName)}, {termLabel(term)}
      </PanelTitle>
      <div className="grid gap-3.5 rounded-3xl bg-surface p-5 shadow-raised">
        {subject.scores.map((s) => (
          <div key={s.component}>
            <div className="mb-1.5 flex justify-between text-sm">
              <span>{s.component}</span>
              <b className="font-semibold tabular-nums">{s.isAbsent ? "Absent" : s.value ?? "—"} <span className="font-normal text-text-secondary">/ {s.maxScore}</span></b>
            </div>
            <span aria-hidden className="relative block h-2.5 overflow-hidden rounded-full bg-sunken" style={level}>
              <span className="absolute inset-y-0 left-0 animate-grow rounded-full" style={{ width: `${((s.value ?? 0) / s.maxScore) * 100}%`, background: "var(--mid)" }} />
            </span>
          </div>
        ))}
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2.5 rounded-3xl bg-surface p-5 text-sm shadow-raised">
        <dt className="text-text-secondary">Total</dt>
        <dd className="m-0 text-right font-semibold tabular-nums">{subject.total} / 100</dd>
        <dt className="text-text-secondary">Grade</dt>
        <dd className="m-0 text-right"><Badge tone={gradeToneFromLetter(subject.grade)}>{subject.grade}, {subject.remark}</Badge></dd>
        {subject.teacherName && (<><dt className="text-text-secondary">Subject teacher</dt><dd className="m-0 text-right font-medium">{subject.teacherName}</dd></>)}
      </dl>
      <button type="button" onClick={onOpenCard} className="mt-auto inline-flex min-h-[46px] items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-text">
        See the whole report card
      </button>
    </SidePanel>
  );
}

export function ParentReportCardDialog({ childId, termId, onClose }: { childId: string; termId: string | null; onClose: () => void }) {
  const card = useParentReportCard(childId, termId);
  if (!termId) return null;
  return (
    <Dialog open onClose={onClose} width={880} title="Report card" description={card.data ? `${card.data.student.fullName}, ${card.data.term.name} ${card.data.term.sessionName}` : undefined}>
      {card.isPending ? <PageSpinner /> : card.error ? <Alert tone="danger">{card.error.message}</Alert> : <ReportCardView card={card.data} />}
      <p className="text-center text-[12.5px] text-text-secondary">To keep a copy, use your browser's Print and choose “Save as PDF”.</p>
    </Dialog>
  );
}
