import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { ArmSummary } from "@brillanda/shared-types";
import { generalError } from "../../shared/auth/LoginPage";
import { Alert } from "../../shared/components/Alert";
import { Button } from "../../shared/components/Button";
import { ProgressBar } from "../../shared/components/Cards";
import { EmptyState } from "../../shared/components/EmptyState";
import { Icon } from "../../shared/components/Icon";
import { Dialog } from "../../shared/components/Overlay";
import { PageHeader } from "../../shared/components/PageHeader";
import { PageSpinner } from "../../shared/components/Spinner";
import { FilterTabs } from "../../shared/components/Tabs";
import { toast } from "../../shared/components/Toast";
import { levelStyle } from "../../shared/theme/levels";
import { plural } from "../../shared/utils/time";
import { useArms, usePublish, useStudents } from "./api";
import { ReportCardDialog, subjectsDone } from "./parts";

type Tab = "READY" | "COMING" | "PUBLISHED";

export function PublishingPage() {
  const arms = useArms();
  const students = useStudents();
  const [tab, setTab] = useState<Tab | null>(null);
  const [deselected, setDeselected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState<string[]>([]);
  const [preview, setPreview] = useState<string | null>(null);

  if (arms.isPending) return <PageSpinner />;
  if (arms.error) return <Alert tone="danger">{arms.error.message}</Alert>;

  const ready = arms.data.filter((a) => a.publishStatus === "COMPLETE");
  const published = arms.data.filter((a) => a.publishStatus === "PUBLISHED");
  const coming = arms.data.filter((a) => a.publishStatus !== "COMPLETE" && a.publishStatus !== "PUBLISHED");
  const current = tab ?? (ready.length ? "READY" : "COMING");
  const list = { READY: ready, COMING: coming, PUBLISHED: published }[current];
  const selected = ready.filter((a) => !deselected.has(a.id));
  const firstStudent = (armId: string) => students.data?.find((s) => s.armId === armId)?.id ?? null;

  return (
    <>
      <PageHeader title="Publishing">
        Publishing locks a class's scores and sends every parent the report card, straight away. A class can be published
        once all its subjects are complete.
      </PageHeader>
      <div className="mb-5">
        <FilterTabs
          label="Show"
          value={current}
          onChange={setTab}
          items={[
            { value: "READY", label: "Ready", count: ready.length },
            { value: "COMING", label: "Still coming in", count: coming.length },
            { value: "PUBLISHED", label: "Published", count: published.length },
          ]}
        />
      </div>

      {list.length ? (
        <ul className="grid gap-0.5 rounded-3xl bg-surface p-2 shadow-raised">
          {list.map((arm) => (
            <li key={arm.id} className="grid grid-cols-[1.6rem_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl p-3 hover:bg-hover sm:grid-cols-[1.6rem_minmax(0,1fr)_minmax(0,1fr)_auto]">
              {current === "READY" ? (
                <input
                  type="checkbox"
                  aria-label={`Select ${arm.name}`}
                  className="h-[20px] w-[20px] accent-[var(--color-accent)]"
                  checked={!deselected.has(arm.id)}
                  onChange={(e) => setDeselected((prev) => { const next = new Set(prev); if (e.target.checked) next.delete(arm.id); else next.add(arm.id); return next; })}
                />
              ) : (
                <span />
              )}
              <div className="flex min-w-0 items-center gap-3">
                <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-semibold" style={{ ...levelStyle(arm.classOrder), background: "var(--tint)", color: "var(--deep)" }}>
                  {arm.name.replace(/^\s*(JSS|SS)\s*/i, "")}
                </span>
                <div className="min-w-0"><b className="font-semibold">{arm.name}</b><p className="text-[12.5px] text-text-secondary">{plural(arm.studentCount, "report card")}</p></div>
              </div>
              {current === "COMING" ? (
                <div className="hidden items-center gap-2.5 sm:flex" style={levelStyle(arm.classOrder)}>
                  <ProgressBar value={subjectsDone(arm) / arm.subjects.length} color="var(--mid)" className="flex-1" />
                  <span className="whitespace-nowrap text-[12.5px] text-text-secondary">{arm.subjects.length - subjectsDone(arm)} to go</span>
                </div>
              ) : (
                <span className="hidden text-[13px] text-text-secondary sm:block">{current === "PUBLISHED" ? "Parents have their report cards" : "All subjects complete"}</span>
              )}
              <div className="flex justify-end">
                {current === "COMING" ? (
                  <Link to={`/admin/classes/${arm.id}`} className="inline-flex min-h-[34px] items-center rounded-full bg-raise px-3.5 text-[13px] font-medium shadow-raised hover:bg-hover">Open</Link>
                ) : (
                  <Button size="sm" variant="secondary" disabled={!firstStudent(arm.id)} onClick={() => setPreview(firstStudent(arm.id))}>Preview</Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={current === "READY" ? "Nothing to publish yet" : current === "COMING" ? "Every class is in" : "Nothing published yet"}>
          {current === "READY" ? "A class lands here the moment its last subject is marked complete." : current === "COMING" ? "Nothing is still coming in." : "Classes you publish this term appear here."}
        </EmptyState>
      )}

      {current === "READY" && ready.length > 0 && (
        <div className="sticky bottom-24 z-20 mt-4 flex animate-pop items-center justify-between gap-4 rounded-[22px] bg-primary py-3 pl-5 pr-3 text-primary-text shadow-float md:bottom-4">
          <div>
            <b className="block font-semibold">{plural(selected.length, "class", "classes")} selected</b>
            <span className="text-[13px] opacity-70">{plural(selected.reduce((n, a) => n + a.studentCount, 0), "report card")}</span>
          </div>
          <button
            type="button"
            disabled={!selected.length}
            onClick={() => setConfirming(selected.map((a) => a.id))}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-full bg-primary-text px-5 text-sm font-medium text-primary transition-transform hover:-translate-y-px disabled:opacity-40"
          >
            <Icon name="publish" className="h-4 w-4" />
            Publish
          </button>
        </div>
      )}

      <PublishDialog armIds={confirming} onClose={() => setConfirming([])} onPreview={(armId) => setPreview(firstStudent(armId))} />
      <ReportCardDialog studentId={preview} onClose={() => setPreview(null)} />
    </>
  );
}

/** Check the numbers, then publish. Used here and from a class's own page. */
export function PublishDialog({ armIds, onClose, onPreview }: { armIds: string[]; onClose: () => void; onPreview?: (armId: string) => void }) {
  const arms = useArms();
  const students = useStudents();
  const publish = usePublish();
  const chosen = useMemo<ArmSummary[]>(() => (arms.data ?? []).filter((a) => armIds.includes(a.id)), [arms.data, armIds]);
  if (!armIds.length) return null;

  const inArms = (students.data ?? []).filter((s) => armIds.includes(s.armId));
  const emailed = inArms.filter((s) => s.parentStatus === "LINKED").length;

  return (
    <Dialog open onClose={onClose} title={`Publish ${plural(chosen.length, "class", "classes")}?`} description="Check the numbers, then publish. Parents are emailed straight away.">
      <dl className="grid gap-0.5 rounded-[18px] bg-surface px-4 py-1.5 text-sm">
        {[
          ["Classes", chosen.map((a) => a.name).join(", ")],
          ["Report cards", String(inArms.length)],
          ["Parents emailed", String(emailed)],
          ["Printed slips needed", String(inArms.length - emailed)],
        ].map(([term, value]) => (
          <div key={term} className="flex justify-between gap-3 border-b border-divider py-2.5 last:border-0">
            <dt className="text-text-secondary">{term}</dt>
            <dd className="m-0 text-right font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <Alert tone="info">Publishing locks every score in {chosen.length === 1 ? "this class" : "these classes"}. A teacher who needs to change one will have to ask you to reopen it.</Alert>
      {publish.error && <Alert tone="danger">{generalError(publish.error)}</Alert>}
      <div className="flex flex-wrap justify-end gap-2">
        {onPreview && <Button variant="secondary" onClick={() => onPreview(armIds[0]!)}>Preview a report card</Button>}
        <Button
          loading={publish.isPending}
          onClick={() => publish.mutate(armIds, {
            onSuccess: (result) => {
              toast(`Published ${chosen.map((a) => a.name).join(" and ")}. ${plural(result.parentsEmailed, "parent is", "parents are")} being emailed`);
              onClose();
            },
          })}
        >
          <Icon name="publish" className="h-4 w-4" />
          {publish.isPending ? "Publishing" : "Publish now"}
        </Button>
      </div>
    </Dialog>
  );
}
