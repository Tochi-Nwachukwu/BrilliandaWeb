import { useMemo, useRef, useState, type DragEvent } from "react";
import { Link } from "react-router-dom";
import {
  guessImportField,
  IMPORT_FIELDS,
  joinName,
  MAX_IMPORT_ROWS,
  type ImportFieldId,
  type ImportRow,
  type ImportRowField,
  type ImportStudentsResponse,
} from "@brillanda/shared-types";
import { fieldError, generalError } from "../../shared/auth/LoginPage";
import { Alert } from "../../shared/components/Alert";
import { Badge } from "../../shared/components/Badge";
import { Button } from "../../shared/components/Button";
import { Icon } from "../../shared/components/Icon";
import { PageHeader } from "../../shared/components/PageHeader";
import { FilterTabs } from "../../shared/components/Tabs";
import { TextAreaField, TextField } from "../../shared/components/TextField";
import { cx } from "../../shared/utils/cx";
import { downloadCsv, parseTable } from "../../shared/utils/table";
import { plural } from "../../shared/utils/time";
import { useCheckImport, useImportStudents } from "./api";

// Importing a school's whole student list (DECISIONS.md F-41): bring the list in (a CSV file, or
// cells pasted from Excel or Google Sheets), match its columns, check every row, then enrol the
// rows that are ready. Rows with problems can be downloaded, fixed and imported again.

type Step = "source" | "columns" | "review" | "done";
type Mapping = (ImportFieldId | "")[];

const today = () => new Date().toISOString().slice(0, 10);
const ROW_FIELD_LABEL: Record<ImportRowField, string> = {
  fullName: "Name", className: "Class", admissionNo: "Admission number", gender: "Gender", dob: "Date of birth",
  guardianName: "Parent's name", guardianPhone: "Parent's phone", guardianEmail: "Parent's email",
};

const TEMPLATE = [
  ["Surname", "First name", "Other names", "Class", "Admission number", "Gender", "Date of birth", "Parent's name", "Parent's phone", "Parent's email"],
  ["Okafor", "Chidera", "Ngozi", "JSS 1A", "", "F", "14/03/2015", "Mrs Bola Okafor", "08031234567", "bola.okafor@example.com"],
  ["Bello", "Tunde", "", "JSS 1B", "", "M", "02/11/2014", "Mr Ade Bello", "08099876543", ""],
];

/** The rows to send, from the table and how its columns are matched. */
function rowsFrom(body: string[][], mapping: Mapping): ImportRow[] {
  const cell = (row: string[], field: ImportFieldId) => {
    const i = mapping.indexOf(field);
    return i >= 0 ? row[i] ?? "" : "";
  };
  return body.map((row) => ({
    fullName: joinName({ fullName: cell(row, "fullName"), surname: cell(row, "surname"), firstName: cell(row, "firstName"), otherNames: cell(row, "otherNames") }),
    className: cell(row, "className"),
    admissionNo: cell(row, "admissionNo"),
    gender: cell(row, "gender"),
    dob: cell(row, "dob"),
    guardianName: cell(row, "guardianName"),
    guardianPhone: cell(row, "guardianPhone"),
    guardianEmail: cell(row, "guardianEmail"),
  }));
}

export function ImportPage() {
  const [step, setStep] = useState<Step>("source");
  const [table, setTable] = useState<string[][]>([]);
  const [hasHeadings, setHasHeadings] = useState(true);
  const [mapping, setMapping] = useState<Mapping>([]);
  const [joinedOn, setJoinedOn] = useState(today());
  const [invite, setInvite] = useState(true);
  const [report, setReport] = useState<ImportStudentsResponse | null>(null);
  const [outcome, setOutcome] = useState<ImportStudentsResponse | null>(null);
  const check = useCheckImport();
  const doImport = useImportStudents();

  const body = hasHeadings ? table.slice(1) : table;
  const rows = useMemo(() => rowsFrom(body, mapping), [body, mapping]);

  const load = (next: string[][]) => {
    const headings = next[0] ?? [];
    const guesses = headings.map((h) => guessImportField(h) ?? "");
    // Each field once: a later column that guesses the same field is left out.
    const mapped = guesses.map((g, i) => (g && guesses.indexOf(g) === i ? g : "")) as Mapping;
    const looksLikeHeadings = mapped.some(Boolean);
    setTable(next);
    setHasHeadings(looksLikeHeadings);
    setMapping(looksLikeHeadings ? mapped : headings.map(() => ""));
    setStep("columns");
  };

  const runCheck = () =>
    check.mutate({ rows, joinedOn, inviteParents: invite }, { onSuccess: (r) => { setReport(r); setStep("review"); } });

  const runImport = () =>
    doImport.mutate({ rows, joinedOn, inviteParents: invite }, { onSuccess: (r) => { setOutcome(r); setStep("done"); } });

  const restart = () => { setTable([]); setReport(null); setOutcome(null); check.reset(); doImport.reset(); setStep("source"); };

  return (
    <>
      <Link to="/admin/students" className="-ml-1 mb-2 inline-flex items-center gap-1 rounded-md px-1 text-sm text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <Icon name="chevron" className="h-4 w-4 rotate-180" />
        Students
      </Link>
      <PageHeader title="Import your student list">
        Bring in a whole class, or the whole school, from your own spreadsheet. Nothing is saved until you've checked it.
      </PageHeader>
      <Steps step={step} />
      {step === "source" && <Source onLoad={load} />}
      {step === "columns" && (
        <Columns
          table={table}
          hasHeadings={hasHeadings}
          setHasHeadings={setHasHeadings}
          mapping={mapping}
          setMapping={setMapping}
          joinedOn={joinedOn}
          setJoinedOn={setJoinedOn}
          invite={invite}
          setInvite={setInvite}
          rowCount={body.length}
          checking={check.isPending}
          error={check.error}
          onBack={restart}
          onCheck={runCheck}
        />
      )}
      {step === "review" && report && (
        <Review report={report} rows={rows} invite={invite} importing={doImport.isPending} error={doImport.error} onBack={() => setStep("columns")} onImport={runImport} />
      )}
      {step === "done" && outcome && <Done outcome={outcome} rows={rows} onAgain={restart} />}
    </>
  );
}

function Steps({ step }: { step: Step }) {
  const steps: [Step, string][] = [["source", "Your list"], ["columns", "Columns"], ["review", "Check"], ["done", "Done"]];
  const at = steps.findIndex(([s]) => s === step);
  return (
    <ol className="mb-6 flex flex-wrap gap-2" aria-label="Import steps">
      {steps.map(([id, label], i) => (
        <li key={id} aria-current={i === at ? "step" : undefined} className={cx("inline-flex h-9 items-center gap-2 rounded-full pl-1.5 pr-4 text-sm", i === at ? "bg-primary text-primary-text" : i < at ? "bg-raise shadow-raised" : "text-text-muted")}>
          <span className={cx("grid h-6 w-6 place-items-center rounded-full text-xs font-semibold", i === at ? "bg-[color-mix(in_oklab,var(--color-primary-text)_18%,transparent)]" : "bg-sunken")}>
            {i < at ? <Icon name="check" className="h-3.5 w-3.5" /> : i + 1}
          </span>
          {label}
        </li>
      ))}
    </ol>
  );
}

function Source({ onLoad }: { onLoad: (table: string[][]) => void }) {
  const [pasted, setPasted] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const take = (text: string) => {
    const table = parseTable(text);
    if (table.length < 1) return setProblem("That list is empty.");
    if (table.length > MAX_IMPORT_ROWS + 1) return setProblem(`That's ${table.length} rows. Import up to ${MAX_IMPORT_ROWS} at a time, for example one class level at a time.`);
    setProblem(null);
    onLoad(table);
  };
  const readFile = async (file: File | undefined) => {
    if (!file) return;
    if (/\.(xlsx|xls|ods)$/i.test(file.name)) return setProblem("That's an Excel file. In Excel, choose File, then Save As, then CSV. Or copy the cells and paste them into the box beside this.");
    if (!/\.(csv|txt|tsv)$/i.test(file.name) && file.type && !/text|csv/.test(file.type)) return setProblem("Choose a CSV file.");
    take(await file.text());
  };
  const drop = (event: DragEvent) => { event.preventDefault(); setDragging(false); void readFile(event.dataTransfer.files[0]); };

  return (
    <div className="grid min-w-0 gap-4 [&>*]:min-w-0">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="grid content-start gap-4 rounded-3xl bg-surface p-5 shadow-raised sm:p-6">
          <h2 className="text-[17px] font-semibold tracking-[-0.02em]">Paste from Excel or Google Sheets</h2>
          <TextAreaField
            label="Select the cells, headings included, copy them, and paste here"
            rows={7}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder={"Surname\tFirst name\tClass\nOkafor\tChidera\tJSS 1A\nBello\tTunde\tJSS 1B"}
            className="[&_textarea]:font-mono [&_textarea]:text-sm"
          />
          <div><Button disabled={!pasted.trim()} onClick={() => take(pasted)}>Use these rows</Button></div>
        </section>
        <section
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={drop}
          className={cx("grid content-center justify-items-center gap-3 rounded-3xl border-2 border-dashed p-6 text-center transition-colors", dragging ? "border-accent bg-accent-soft" : "border-divider bg-surface")}
        >
          <span aria-hidden className="grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent"><Icon name="upload" className="h-6 w-6" /></span>
          <h2 className="text-[17px] font-semibold tracking-[-0.02em]">Or upload a CSV file</h2>
          <p className="max-w-xs text-sm text-text-secondary">Drop it here, or choose it. From Excel, use File, then Save As, then CSV.</p>
          <input ref={input} type="file" accept=".csv,.txt,.tsv,text/csv,.xlsx,.xls" className="sr-only" aria-label="Choose a CSV file" onChange={(e) => { void readFile(e.target.files?.[0]); e.target.value = ""; }} />
          <Button variant="secondary" onClick={() => input.current?.click()}><Icon name="upload" className="h-4 w-4" />Choose a file</Button>
        </section>
      </div>
      {problem && <Alert tone="danger">{problem}</Alert>}
      <p className="text-sm text-text-secondary">
        Starting from scratch?{" "}
        <button type="button" className="font-medium text-accent hover:underline" onClick={() => downloadCsv("brillanda-student-list.csv", TEMPLATE)}>Download a template</button>{" "}
        with the columns Brillanda reads. Only the name and class are needed.
      </p>
    </div>
  );
}

function Columns(props: {
  table: string[][];
  hasHeadings: boolean;
  setHasHeadings: (v: boolean) => void;
  mapping: Mapping;
  setMapping: (m: Mapping) => void;
  joinedOn: string;
  setJoinedOn: (v: string) => void;
  invite: boolean;
  setInvite: (v: boolean) => void;
  rowCount: number;
  checking: boolean;
  error: unknown;
  onBack: () => void;
  onCheck: () => void;
}) {
  const { table, hasHeadings, mapping } = props;
  const width = Math.max(...table.map((r) => r.length));
  const samples = (hasHeadings ? table.slice(1) : table).slice(0, 3);
  const has = (f: ImportFieldId) => mapping.includes(f);
  const missing = [
    !(has("fullName") || has("surname") || has("firstName")) && "a name",
    !has("className") && "a class",
  ].filter(Boolean) as string[];
  const choose = (column: number, field: ImportFieldId | "") =>
    props.setMapping(Array.from({ length: width }, (_, i) => (i === column ? field : mapping[i] === field && field ? "" : mapping[i] ?? "")));

  return (
    <div className="grid min-w-0 gap-4 [&>*]:min-w-0">
      <section className="rounded-3xl bg-surface p-5 shadow-raised sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-semibold tracking-[-0.02em]">What's in each column?</h2>
            <p className="mt-0.5 text-[13px] text-text-secondary">We've guessed from the headings. Change any that are wrong, and leave out columns Brillanda doesn't need.</p>
          </div>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input type="checkbox" className="h-[18px] w-[18px] accent-[var(--color-accent)]" checked={hasHeadings} onChange={(e) => props.setHasHeadings(e.target.checked)} />
            The first row is headings
          </label>
        </div>
        <ul className="grid gap-2">
          {Array.from({ length: width }, (_, i) => (
            <li key={i} className="grid items-center gap-2 rounded-2xl bg-sunken p-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_14rem] sm:gap-4">
              <b className="truncate text-sm font-semibold">{hasHeadings ? table[0]![i] || `Column ${i + 1}` : `Column ${i + 1}`}</b>
              <span className="truncate text-[13px] text-text-secondary">{samples.map((r) => r[i]).filter(Boolean).join(", ") || "Empty"}</span>
              <select
                aria-label={`Column ${i + 1}: ${hasHeadings ? table[0]![i] : ""}`}
                value={mapping[i] ?? ""}
                onChange={(e) => choose(i, e.target.value as ImportFieldId | "")}
                className={cx("min-h-[42px] rounded-xl border-0 px-3 text-[15px] focus:outline-none focus:ring-2 focus:ring-accent", mapping[i] ? "bg-surface font-medium" : "bg-surface text-text-muted")}
              >
                <option value="">Leave out</option>
                {IMPORT_FIELDS.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </li>
          ))}
        </ul>
      </section>
      <section className="grid gap-4 rounded-3xl bg-surface p-5 shadow-raised sm:grid-cols-2 sm:p-6">
        <TextField label="They join on" type="date" value={props.joinedOn} max={today()} onChange={(e) => props.setJoinedOn(e.target.value)} hint="Usually the first day of term." error={fieldError(props.error, "joinedOn")} />
        <label className="flex cursor-pointer items-start gap-2.5 self-center text-sm">
          <input type="checkbox" className="mt-0.5 h-[18px] w-[18px] accent-[var(--color-accent)]" checked={props.invite} disabled={!has("guardianEmail")} onChange={(e) => props.setInvite(e.target.checked)} />
          <span>
            Email an invite to every parent with an email
            <span className="block text-[13px] text-text-secondary">{has("guardianEmail") ? "They'll get a link to set a password and see results." : "Match a column to Parent's email to send invites."}</span>
          </span>
        </label>
      </section>
      {missing.length > 0 && <Alert tone="warning">Match a column to {missing.join(" and ")}. Brillanda needs both for every student.</Alert>}
      {generalError(props.error) && <Alert tone="danger">{generalError(props.error)}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button disabled={missing.length > 0 || !props.rowCount} loading={props.checking} onClick={props.onCheck}>Check {plural(props.rowCount, "student")}</Button>
        <Button variant="ghost" onClick={props.onBack}>Start again</Button>
      </div>
    </div>
  );
}

type Filter = "PROBLEM" | "READY" | "ALL";

function Review({ report, rows, invite, importing, error, onBack, onImport }: { report: ImportStudentsResponse; rows: ImportRow[]; invite: boolean; importing: boolean; error: unknown; onBack: () => void; onImport: () => void }) {
  const [filter, setFilter] = useState<Filter>(report.problems ? "PROBLEM" : "READY");
  const shown = report.results.filter((r) => filter === "ALL" || r.status === filter);
  const invites = report.results.filter((r) => r.status === "READY" && rows[r.row]!.guardianEmail.trim()).length;

  return (
    <div className="grid min-w-0 gap-4 [&>*]:min-w-0">
      <div className="grid grid-cols-2 gap-3.5">
        <Tile level={0} value={report.ready} label={report.ready === 1 ? "student ready" : "students ready"} />
        <Tile level={5} value={report.problems} label={report.problems === 1 ? "row needs fixing" : "rows need fixing"} />
      </div>
      <section className="rounded-3xl bg-surface p-5 shadow-raised sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <FilterTabs label="Rows" value={filter} onChange={setFilter} items={[{ value: "PROBLEM", label: "Needs fixing", count: report.problems }, { value: "READY", label: "Ready", count: report.ready }, { value: "ALL", label: "All" }]} />
          {report.problems > 0 && (
            <Button size="sm" variant="secondary" onClick={() => downloadProblems(report, rows)}><Icon name="upload" className="h-4 w-4 rotate-180" />Download rows to fix</Button>
          )}
        </div>
        <ResultTable results={shown.slice(0, 200)} rows={rows} />
        {shown.length > 200 && <p className="mt-3 text-[13px] text-text-secondary">Showing the first 200 of {shown.length}.</p>}
      </section>
      {report.problems > 0 && (
        <p className="text-sm text-text-secondary">
          Rows that need fixing are skipped. Download them, fix them in your spreadsheet, and import them again afterwards. Nobody is enrolled twice.
        </p>
      )}
      {generalError(error) && <Alert tone="danger">{generalError(error)}</Alert>}
      <div className="flex flex-wrap gap-2">
        <Button disabled={!report.ready} loading={importing} onClick={onImport}>
          Import {plural(report.ready, "student")}{invite && invites ? ` and invite ${plural(invites, "parent")}` : ""}
        </Button>
        <Button variant="ghost" onClick={onBack}>Back to columns</Button>
      </div>
    </div>
  );
}

function Tile({ level, value, label }: { level: number; value: number; label: string }) {
  return (
    <div className="grid gap-1 rounded-[22px] p-[18px]" style={{ background: `var(--level-${level + 1}-tint)`, color: `var(--level-${level + 1}-deep)` }}>
      <span className="text-[34px] font-medium leading-none tracking-[-0.03em] tabular-nums">{value}</span>
      <span className="text-sm opacity-85">{label}</span>
    </div>
  );
}

function ResultTable({ results, rows }: { results: ImportStudentsResponse["results"]; rows: ImportRow[] }) {
  if (!results.length) return <p className="py-6 text-center text-sm text-text-secondary">Nothing here.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="text-left text-xs text-text-muted">
            <th className="py-1.5 pr-2 font-medium">Row</th>
            <th className="px-2 py-1.5 font-medium">Name</th>
            <th className="px-2 py-1.5 font-medium">Class</th>
            <th className="px-2 py-1.5 font-medium">Admission number</th>
            <th className="py-1.5 pl-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => {
            const row = rows[r.row]!;
            const problems = Object.entries(r.problems) as [ImportRowField, string][];
            return (
              <tr key={r.row} className="border-t border-divider align-top">
                <td className="py-2.5 pr-2 tabular-nums text-text-muted">{r.row + 1}</td>
                <td className="px-2 py-2.5">
                  <b className="font-medium">{row.fullName || "—"}</b>
                  {problems.length > 0 && (
                    <ul className="mt-1 grid gap-0.5 text-[13px] text-danger">
                      {problems.map(([field, message]) => <li key={field}><span className="font-medium">{ROW_FIELD_LABEL[field]}:</span> {message}</li>)}
                    </ul>
                  )}
                </td>
                <td className="px-2 py-2.5">{r.armName ?? <span className="text-text-muted">{row.className || "—"}</span>}</td>
                <td className="px-2 py-2.5 tabular-nums">{r.admissionNo ?? "—"}{r.admissionNo && !row.admissionNo.trim() && <span className="ml-1.5 text-xs text-text-muted">new</span>}</td>
                <td className="py-2.5 pl-2">
                  {r.status === "PROBLEM" ? <Badge tone="danger">Needs fixing</Badge> : r.status === "ENROLLED" ? <Badge tone="success">Enrolled</Badge> : <Badge tone="success">Ready</Badge>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** The rows that need fixing, as a CSV with a "What to fix" column, ready to correct and import again. */
function downloadProblems(report: ImportStudentsResponse, rows: ImportRow[]) {
  const fields = Object.keys(ROW_FIELD_LABEL) as ImportRowField[];
  const out = report.results.filter((r) => r.status === "PROBLEM").map((r) => [
    ...fields.map((f) => rows[r.row]![f]),
    Object.entries(r.problems).map(([f, m]) => `${ROW_FIELD_LABEL[f as ImportRowField]}: ${m}`).join(" "),
  ]);
  downloadCsv("students-to-fix.csv", [[...fields.map((f) => (f === "fullName" ? "Full name" : ROW_FIELD_LABEL[f])), "What to fix"], ...out]);
}

function Done({ outcome, rows, onAgain }: { outcome: ImportStudentsResponse; rows: ImportRow[]; onAgain: () => void }) {
  return (
    <div className="grid min-w-0 gap-4 [&>*]:min-w-0">
      <section className="grid animate-pop justify-items-center gap-3 rounded-3xl bg-surface px-6 py-12 text-center shadow-raised">
        <span aria-hidden className="grid h-16 w-16 place-items-center rounded-full bg-success-bg text-success"><Icon name="check" className="h-8 w-8" /></span>
        <h2 className="text-[26px] font-medium tracking-[-0.03em]">{plural(outcome.enrolled, "student")} enrolled</h2>
        <p className="max-w-md text-text-secondary">
          {outcome.parentsInvited ? `${plural(outcome.parentsInvited, "parent")} will get an invite by email. ` : ""}
          {outcome.problems ? `${plural(outcome.problems, "row was", "rows were")} skipped. Fix them and import them the same way.` : "Every row went in."}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Link to="/admin/students" className="inline-flex min-h-[42px] items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">See your students</Link>
          {outcome.problems > 0 && <Button variant="secondary" onClick={() => downloadProblems(outcome, rows)}>Download skipped rows</Button>}
          <Button variant="ghost" onClick={onAgain}>Import another list</Button>
        </div>
      </section>
    </div>
  );
}

