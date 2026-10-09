"use client";

import { checkRows, guessMapping, IMPORT_COLUMNS, mappingProblems, toCsv, type CheckedRow, type ImportColumnId, type ImportMapping, type RawRow } from "@brillianda/core";
import { Alert, Badge, Button, Card, EmptyState, FilterTabs, Icon, PageHeader, ResponsiveDialog, SelectField, TextField, cx, toast } from "@brillianda/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { readStudentFile, type Sheet } from "@/lib/import/readFile";
import { downloadTemplate } from "@/lib/import/template";
import { formatDate } from "@/lib/time";
import type { ActionResult, ImportResult, ImportSetup } from "@/data/types";

type Actions = {
  checkImport: (rows: unknown, armId: string | null) => Promise<ActionResult<CheckedRow[]>>;
  commitImport: (input: unknown) => Promise<ActionResult<ImportResult>>;
  undoImport: (batchId: string) => Promise<ActionResult<{ removed: number }>>;
  saveImportMapping: (mapping: Record<string, string>) => Promise<void>;
};

const LABEL = Object.fromEntries(IMPORT_COLUMNS.map((c) => [c.id, c.label])) as Record<ImportColumnId, string>;
const PAGE = 50;

function downloadCsv(name: string, csv: string) {
  const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
  Object.assign(document.createElement("a"), { href: url, download: name }).click();
  URL.revokeObjectURL(url);
}

/** The plan's import, start to finish: upload, match columns, review and fix, import, undo. */
export function ImportFlow({ school, setup, arm, actions }: { school: string; setup: ImportSetup; arm: { id: string; label: string } | null; actions: Actions }) {
  const router = useRouter();
  const [step, setStep] = useState<"upload" | "map" | "review" | "done">("upload");
  const [fileName, setFileName] = useState("");
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [rows, setRows] = useState<RawRow[]>([]);
  const [checked, setChecked] = useState<CheckedRow[]>([]);
  const [update, setUpdate] = useState<Set<number>>(new Set());
  const [result, setResult] = useState<ImportResult | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const ctx = useMemo(() => ({ levels: setup.levels, arms: setup.arms, existing: setup.existing, armId: arm?.id ?? null }), [setup, arm]);

  const pick = (file: File | undefined) => {
    if (!file) return;
    setFailure(null);
    startTransition(async () => {
      const read = await readStudentFile(file);
      if (!read.ok) return setFailure(read.message);
      setFileName(file.name);
      setSheet(read.sheet);
      // The remembered mapping first, then a guess for anything new.
      const guess = guessMapping(read.sheet.headings);
      const saved = setup.savedMapping;
      setMapping(Object.fromEntries(read.sheet.headings.map((h, i) => [i, (saved[h.trim().toLowerCase()] as ImportColumnId | undefined) ?? guess[i] ?? null])));
      setStep("map");
    });
  };

  const toRows = (s: Sheet, m: ImportMapping): RawRow[] =>
    s.rows.map((cells) => {
      const row: RawRow = {};
      Object.entries(m).forEach(([i, column]) => {
        if (column) row[column] = cells[Number(i)] ?? "";
      });
      return row;
    });

  const check = () => {
    if (!sheet) return;
    const raw = toRows(sheet, mapping);
    startTransition(async () => {
      // The server checks every row itself; it never trusts the browser (plan).
      const answer = await actions.checkImport(raw, arm?.id ?? null);
      if (!answer.ok) return setFailure(answer.error);
      void actions.saveImportMapping(Object.fromEntries(sheet.headings.map((h, i) => [h.trim().toLowerCase(), mapping[i] ?? ""]).filter(([, v]) => v)));
      setRows(raw);
      setChecked(answer.data);
      setUpdate(new Set());
      setStep("review");
    });
  };

  /** A fixed row is checked again at once, with the same rules; the server checks again on import. */
  const fixRow = (index: number, values: RawRow) => {
    const next = rows.map((r, i) => (i === index ? { ...r, ...values } : r));
    setRows(next);
    setChecked(checkRows(next, ctx));
  };

  const ready = checked.filter((r) => r.status === "ready").length;
  const duplicates = checked.filter((r) => r.status === "duplicate");
  const toFix = checked.filter((r) => r.status === "fix");
  const willImport = ready + update.size;

  const commit = () =>
    startTransition(async () => {
      const answer = await actions.commitImport({ rows, armId: arm?.id ?? null, update: [...update], fileName });
      if (!answer.ok) return setFailure(answer.error);
      setResult(answer.data);
      setStep("done");
      router.refresh();
    });

  const downloadFailed = () => {
    if (!sheet) return;
    const header = [...sheet.headings, "What to fix"];
    const body = toFix.map((r) => [...sheet.headings.map((_, i) => rows[r.index]?.[mapping[i]!] ?? sheet.rows[r.index]?.[i] ?? ""), r.problems.filter((p) => p.blocking).map((p) => p.message).join("; ")]);
    downloadCsv(`${fileName.replace(/\.[^.]+$/, "")}-to-fix.csv`, toCsv(header, body));
  };

  return (
    <div className="grid gap-4">
      <PageHeader
        title={arm ? `Import into ${arm.label}` : "Import students"}
        actions={
          <Link href={`/s/${school}/students`} className="text-sm font-medium text-accent hover:underline">
            Back to students
          </Link>
        }
      >
        {step === "upload" && "From Excel, CSV or a Word table. Up to 5,000 students at a time. Nothing is saved until you press Import."}
        {step === "map" && `${sheet?.rows.length.toLocaleString()} rows in ${fileName}. Check what each column holds.`}
        {step === "review" && `${checked.length.toLocaleString()} rows checked.`}
        {step === "done" && "Done."}
      </PageHeader>

      {failure && <Alert tone="danger">{failure}</Alert>}

      {step === "upload" && (
        <>
          <Card title="1. Your file" description="Excel (.xlsx), CSV, or a Word document (.docx) with the students in a table.">
            <label
              className={cx("grid min-h-[160px] cursor-pointer place-items-center rounded-3xl border-2 border-dashed border-border-strong bg-sunken p-6 text-center transition-colors hover:bg-hover has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent", pending && "opacity-60")}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                pick(e.dataTransfer.files[0]);
              }}
            >
              <input ref={input} type="file" className="sr-only" accept=".xlsx,.csv,.docx,.xls,.doc,text/csv" onChange={(e) => pick(e.target.files?.[0])} />
              <span className="grid justify-items-center gap-2">
                <Icon name="upload" className="h-7 w-7 text-accent" />
                <b className="font-semibold">{pending ? "Reading…" : "Choose a file"}</b>
                <span className="text-sm text-text-secondary">or drop it here</span>
              </span>
            </label>
          </Card>
          <Card title="No list yet?" description={arm ? `A template for ${arm.label}: no Class or Arm columns needed.` : "A template with your classes and arms as dropdowns, so nobody types “Jss one”."}>
            <Button
              variant="secondary"
              onClick={() =>
                downloadTemplate(setup.schoolName, setup.levels, setup.arms, arm ? { label: arm.label } : undefined).catch(() => toast("The template couldn’t be made. Try again."))
              }
            >
              <Icon name="upload" className="h-4 w-4 rotate-180" />
              Download the Excel template
            </Button>
          </Card>
          {setup.batches.length > 0 && <RecentImports batches={setup.batches} undo={actions.undoImport} />}
        </>
      )}

      {step === "map" && sheet && (
        <MapColumns
          sheet={sheet}
          mapping={mapping}
          setMapping={setMapping}
          perClass={!!arm}
          pending={pending}
          onBack={() => setStep("upload")}
          onNext={check}
        />
      )}

      {step === "review" && sheet && (
        <Review
          checked={checked}
          rows={rows}
          mapping={mapping}
          update={update}
          setUpdate={setUpdate}
          counts={{ ready, duplicates: duplicates.length, fix: toFix.length }}
          onFix={fixRow}
          onDownloadFailed={downloadFailed}
          onBack={() => setStep("map")}
          willImport={willImport}
          pending={pending}
          onImport={commit}
        />
      )}

      {step === "done" && result && (
        <Done
          school={school}
          result={result}
          undo={actions.undoImport}
          onAgain={() => {
            setStep("upload");
            setResult(null);
            setSheet(null);
            if (input.current) input.current.value = "";
          }}
        />
      )}
    </div>
  );
}

function MapColumns({
  sheet,
  mapping,
  setMapping,
  perClass,
  pending,
  onBack,
  onNext,
}: {
  sheet: Sheet;
  mapping: ImportMapping;
  setMapping: (m: ImportMapping) => void;
  perClass: boolean;
  pending: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  const problems = mappingProblems(mapping, perClass);
  const options = IMPORT_COLUMNS.filter((c) => !perClass || (c.id !== "className" && c.id !== "armName"));
  return (
    <Card title="2. Match the columns" description="We guessed from the headings. Change any that are wrong; pick “Leave out” for columns you don’t need.">
      <ul className="grid gap-3">
        {sheet.headings.map((heading, i) => {
          const samples = sheet.rows
            .slice(0, 3)
            .map((r) => r[i])
            .filter(Boolean)
            .join(", ");
          return (
            <li key={i} className="grid gap-2 rounded-2xl bg-sunken/60 p-3 md:grid-cols-[minmax(0,1fr)_16rem] md:items-center">
              <div className="min-w-0">
                <b className="block truncate font-semibold">{heading || `Column ${i + 1}`}</b>
                <span className="block truncate text-[12.5px] text-text-secondary">{samples || "Empty in the first rows"}</span>
              </div>
              <SelectField
                label={`What “${heading || `Column ${i + 1}`}” holds`}
                className="[&>label]:sr-only"
                value={mapping[i] ?? ""}
                onChange={(e) => {
                  const value = (e.target.value || null) as ImportColumnId | null;
                  // Each column is used once: picking it here takes it off any other heading.
                  setMapping(Object.fromEntries(Object.entries(mapping).map(([k, v]) => [k, Number(k) === i ? value : v === value ? null : v])));
                }}
              >
                <option value="">Leave out</option>
                {options.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </SelectField>
            </li>
          );
        })}
      </ul>
      {problems.length > 0 && (
        <div className="mt-4">
          <Alert tone="warning">{problems.join(" ")}</Alert>
        </div>
      )}
      <div className="mt-5 flex flex-wrap justify-between gap-2">
        <Button variant="ghost" onClick={onBack}>
          Choose another file
        </Button>
        <Button loading={pending} disabled={!!problems.length} onClick={onNext}>
          Check {sheet.rows.length.toLocaleString()} rows
        </Button>
      </div>
    </Card>
  );
}

function Review({
  checked,
  rows,
  mapping,
  update,
  setUpdate,
  counts,
  onFix,
  onDownloadFailed,
  onBack,
  willImport,
  pending,
  onImport,
}: {
  checked: CheckedRow[];
  rows: RawRow[];
  mapping: ImportMapping;
  update: Set<number>;
  setUpdate: (s: Set<number>) => void;
  counts: { ready: number; duplicates: number; fix: number };
  onFix: (index: number, values: RawRow) => void;
  onDownloadFailed: () => void;
  onBack: () => void;
  willImport: number;
  pending: boolean;
  onImport: () => void;
}) {
  const [tab, setTab] = useState<"fix" | "duplicate" | "ready">(counts.fix ? "fix" : counts.duplicates ? "duplicate" : "ready");
  const [shown, setShown] = useState(PAGE);
  const [fixing, setFixing] = useState<CheckedRow | null>(null);
  const list = checked.filter((r) => r.status === tab);
  const nameOf = (r: CheckedRow) => {
    const raw = rows[r.index] ?? {};
    return [raw.firstName, raw.otherNames, raw.lastName].filter(Boolean).join(" ") || raw.fullName || "No name";
  };

  return (
    // Room under the list on a phone, so the last row scrolls clear of the Import bar.
    <div className="grid gap-4 pb-20 md:pb-0">
      <Card title="3. Check and fix" description="Fix a row here, or download the rows to fix, correct them in Excel and import them after.">
        <div className="grid gap-4">
          <FilterTabs
            label="Rows"
            value={tab}
            onChange={(v) => {
              setTab(v);
              setShown(PAGE);
            }}
            items={[
              { value: "fix", label: "Needs fixing", count: counts.fix },
              { value: "duplicate", label: "Possible duplicates", count: counts.duplicates },
              { value: "ready", label: "Ready", count: counts.ready },
            ]}
          />
          {tab === "fix" && counts.fix > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary" onClick={onDownloadFailed}>
                Download the {counts.fix} rows to fix
              </Button>
              <span className="text-[13px] text-text-secondary">These rows are left out of this import until they’re fixed.</span>
            </div>
          )}
          {tab === "duplicate" && counts.duplicates > 0 && (
            <p className="text-sm text-text-secondary">These admission numbers already belong to students here. Update them with this file’s details, or skip them.</p>
          )}
          {list.length ? (
            <ul className="grid gap-2" aria-label={tab === "fix" ? "Rows to fix" : tab === "duplicate" ? "Possible duplicates" : "Ready rows"}>
              {list.slice(0, shown).map((r) => (
                <li key={r.index} className="grid gap-2 rounded-2xl bg-sunken/60 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="min-w-0">
                      <b className="font-semibold">{nameOf(r)}</b> <span className="text-[12.5px] text-text-secondary">Row {r.index + 2}{r.student ? ` · ${r.student.armLabel}` : ""}</span>
                    </span>
                    {r.status === "fix" && (
                      <Button size="sm" onClick={() => setFixing(r)}>
                        Fix
                      </Button>
                    )}
                    {r.status === "duplicate" && (
                      <div role="group" aria-label={`Row ${r.index + 2}`} className="inline-flex rounded-full bg-surface p-1">
                        {(["skip", "update"] as const).map((choice) => {
                          const on = choice === "update" ? update.has(r.index) : !update.has(r.index);
                          return (
                            <button
                              key={choice}
                              type="button"
                              aria-pressed={on}
                              onClick={() => {
                                const next = new Set(update);
                                if (choice === "update") next.add(r.index);
                                else next.delete(r.index);
                                setUpdate(next);
                              }}
                              className={cx("h-8 rounded-full px-3 text-[13px] font-medium", on ? "bg-primary text-primary-text" : "text-text-secondary")}
                            >
                              {choice === "update" ? "Update" : "Skip"}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  {r.problems.length > 0 && (
                    <ul className="grid gap-1 text-[13px]">
                      {r.problems.map((p, i) => (
                        <li key={i} className={cx("flex gap-2", p.blocking ? "text-danger" : "text-text-secondary")}>
                          <span aria-hidden>{p.blocking ? "●" : "○"}</span>
                          <span>
                            <b className="font-medium">{LABEL[p.column]}:</b> {p.message}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title={tab === "fix" ? "Nothing to fix" : tab === "duplicate" ? "No duplicates" : "No rows ready yet"}>
              {tab === "ready" ? "Fix the rows on the first tab and they move here." : "Every row in this group is fine."}
            </EmptyState>
          )}
          {list.length > shown && (
            <Button variant="secondary" onClick={() => setShown((n) => n + PAGE)}>
              Show more ({list.length - shown} left)
            </Button>
          )}
        </div>
      </Card>

      <div className="sticky bottom-[92px] z-10 flex items-center justify-between gap-2 rounded-[22px] bg-[color-mix(in_oklab,var(--color-surface)_92%,transparent)] p-2 pl-3 shadow-float backdrop-blur-md md:bottom-3">
        <Button variant="ghost" size="sm" onClick={onBack} aria-label="Back to columns">
          Back
        </Button>
        <Button loading={pending} disabled={!willImport} onClick={onImport}>
          Import {willImport.toLocaleString()} {willImport === 1 ? "student" : "students"}
        </Button>
      </div>

      {fixing && (
        <FixRow
          row={fixing}
          raw={rows[fixing.index] ?? {}}
          columns={[...new Set([...Object.values(mapping).filter((c): c is ImportColumnId => !!c), ...fixing.problems.map((p) => p.column)])]}
          onClose={() => setFixing(null)}
          onSave={(values) => {
            onFix(fixing.index, values);
            setFixing(null);
          }}
        />
      )}
    </div>
  );
}

/** Fixing one row in place (plan: a bottom sheet on a phone). Suggestions are applied only by a tap. */
function FixRow({ row, raw, columns, onClose, onSave }: { row: CheckedRow; raw: RawRow; columns: ImportColumnId[]; onClose: () => void; onSave: (values: RawRow) => void }) {
  const [values, setValues] = useState<RawRow>(raw);
  const problemOf = (c: ImportColumnId) => row.problems.find((p) => p.column === c);
  // Fields with a problem first, so a phone user starts where it matters.
  const ordered = [...columns].sort((a, b) => Number(!!problemOf(b)?.blocking) - Number(!!problemOf(a)?.blocking));
  return (
    <ResponsiveDialog
      open
      onClose={onClose}
      title={`Fix row ${row.index + 2}`}
      description="Correct the highlighted cells. The row is checked again when you save."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => onSave(values)}>Save the row</Button>
        </>
      }
    >
      <div className="grid gap-4">
        {ordered.map((column) => {
          const problem = problemOf(column);
          return (
            <div key={column} className="grid gap-1.5">
              <TextField label={LABEL[column]} value={values[column] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [column]: e.target.value }))} error={problem?.blocking ? problem.message : undefined} hint={problem && !problem.blocking ? problem.message : undefined} />
              {problem?.suggestion && (
                <Button size="sm" variant="secondary" className="justify-self-start" onClick={() => setValues((v) => ({ ...v, [column]: problem.suggestion }))}>
                  Use {problem.suggestion}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </ResponsiveDialog>
  );
}

function Done({ school, result, undo, onAgain }: { school: string; result: ImportResult; undo: (batchId: string) => Promise<ActionResult<{ removed: number }>>; onAgain: () => void }) {
  const router = useRouter();
  const [undone, setUndone] = useState(false);
  const [pending, startTransition] = useTransition();
  return (
    <Card title="4. Imported" description={undone ? "Undone: the new students from this file are gone." : "Undo removes this whole import for the next 24 hours, as long as nobody edits these students."}>
      <div className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          <Badge tone="success">{result.created} added</Badge>
          {result.updated > 0 && <Badge tone="info">{result.updated} updated</Badge>}
          {result.skipped > 0 && <Badge>{result.skipped} skipped</Badge>}
          {result.notImported > 0 && <Badge tone="warning">{result.notImported} still to fix</Badge>}
        </div>
        {!undone && result.newStudents.length > 0 && (
          <ul className="grid gap-1 text-sm" aria-label="New students">
            {result.newStudents.slice(0, 8).map((s) => (
              <li key={s.id}>
                <Link href={`/s/${school}/students/${s.id}`} className="font-medium text-accent hover:underline">
                  {s.fullName}
                </Link>{" "}
                <span className="text-text-secondary">· {s.armLabel}</span>
              </li>
            ))}
            {result.newStudents.length > 8 && <li className="text-text-secondary">and {result.newStudents.length - 8} more</li>}
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <Link href={`/s/${school}/students`} className="inline-flex min-h-[42px] items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-text hover:bg-primary-hover">
            See the students
          </Link>
          <Button variant="secondary" onClick={onAgain}>
            Import another file
          </Button>
          {!undone && result.created > 0 && (
            <Button
              variant="danger-quiet"
              loading={pending}
              onClick={() =>
                startTransition(async () => {
                  const answer = await undo(result.batchId);
                  toast(answer.ok ? `Removed ${answer.data.removed} students from this import` : answer.error);
                  if (answer.ok) {
                    setUndone(true);
                    router.refresh();
                  }
                })
              }
            >
              Undo this import
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

function RecentImports({ batches, undo }: { batches: ImportSetup["batches"]; undo: (batchId: string) => Promise<ActionResult<{ removed: number }>> }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Card title="Recent imports">
      <ul className="grid gap-2">
        {batches.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-sunken/60 p-3 text-sm">
            <span className="min-w-0">
              <b className="font-semibold">{b.fileName}</b>{" "}
              <span className="text-text-secondary">
                · {b.created} added{b.updated ? `, ${b.updated} updated` : ""} by {b.by}, {formatDate(new Date(b.at).toISOString().slice(0, 10))}
              </span>
            </span>
            {b.undone ? (
              <Badge>Undone</Badge>
            ) : b.undoable ? (
              <Button
                size="sm"
                variant="danger-quiet"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const answer = await undo(b.id);
                    toast(answer.ok ? `Removed ${answer.data.removed} students` : answer.error);
                    router.refresh();
                  })
                }
              >
                Undo
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </Card>
  );
}
