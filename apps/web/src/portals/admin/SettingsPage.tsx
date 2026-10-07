import { useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { admissionPatternProblems, formatAdmissionNo, resolveGrade, type AdmissionNumberSettings, type GradeBand, type SchoolProfile, type TermDates } from "@brillanda/shared-types";
import { fieldError, generalError } from "../../shared/auth/LoginPage";
import { Alert } from "../../shared/components/Alert";
import { Button } from "../../shared/components/Button";
import { Card } from "../../shared/components/Cards";
import { Icon } from "../../shared/components/Icon";
import { PageHeader } from "../../shared/components/PageHeader";
import { PageSpinner } from "../../shared/components/Spinner";
import { FilterTabs } from "../../shared/components/Tabs";
import { SelectField, TextField } from "../../shared/components/TextField";
import { toast } from "../../shared/components/Toast";
import { useLook } from "../../shared/theme/useLook";
import { cx } from "../../shared/utils/cx";
import { SessionSection } from "./SessionSettings";
import { useAdmissionNumbers, useGradingScale, useRemoveLogo, useSaveAdmissionNumbers, useSaveScale, useSaveSchool, useSaveTerm, useSchoolProfile, useTermDates, useUploadLogo } from "./api";

type Tab = "SCHOOL" | "NUMBERS" | "SCALE" | "TERM" | "LOOK";
const TABS: Tab[] = ["SCHOOL", "NUMBERS", "SCALE", "TERM", "LOOK"];

export function SettingsPage() {
  // The tab lives in the address (?tab=scale), so the setup checklist can link straight to one.
  const [params, setParams] = useSearchParams();
  const asked = params.get("tab")?.toUpperCase() as Tab | undefined;
  const tab: Tab = asked && TABS.includes(asked) ? asked : "SCHOOL";
  const setTab = (next: Tab) => setParams({ tab: next.toLowerCase() }, { replace: true });
  return (
    <>
      <PageHeader title="Settings" />
      <div className="mb-5">
        <FilterTabs label="Settings" value={tab} onChange={setTab} items={[{ value: "SCHOOL", label: "School" }, { value: "NUMBERS", label: "Admission numbers" }, { value: "SCALE", label: "Grading scale" }, { value: "TERM", label: "Session" }, { value: "LOOK", label: "Look" }]} />
      </div>
      <div className="max-w-2xl">
        {tab === "SCHOOL" && <SchoolTab />}
        {tab === "NUMBERS" && <NumbersTab />}
        {tab === "SCALE" && <ScaleTab />}
        {tab === "TERM" && <SessionSection><TermTab /></SessionSection>}
        {tab === "LOOK" && <LookTab />}
      </div>
    </>
  );
}

function SchoolTab() {
  const profile = useSchoolProfile();
  if (profile.isPending) return <PageSpinner />;
  if (profile.error) return <Alert tone="danger">{profile.error.message}</Alert>;
  return (
    <div className="grid gap-4">
      <LogoCard logoUrl={profile.data.logoUrl ?? null} name={profile.data.name} />
      <SchoolForm initial={profile.data} />
    </div>
  );
}

function LogoCard({ logoUrl, name }: { logoUrl: string | null; name: string }) {
  const upload = useUploadLogo();
  const remove = useRemoveLogo();
  const input = useRef<HTMLInputElement>(null);
  const error = fieldError(upload.error, "logo") ?? generalError(upload.error) ?? generalError(remove.error);
  const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <Card title="Logo" description="Printed at the top of report cards. A square PNG, JPG, WebP or SVG under 1 MB works best.">
      <div className="flex flex-wrap items-center gap-4">
        <span className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-sunken text-xl font-semibold text-text-secondary">
          {logoUrl ? <img src={logoUrl} alt={`${name} logo`} className="h-full w-full object-contain p-1.5" /> : <span aria-hidden>{initials}</span>}
        </span>
        <div className="flex flex-wrap gap-2">
          <input
            ref={input}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="sr-only"
            aria-label="Choose a logo image"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload.mutate(file, { onSuccess: () => toast("Logo saved") });
              e.target.value = "";
            }}
          />
          <Button variant={logoUrl ? "secondary" : "primary"} loading={upload.isPending} onClick={() => input.current?.click()}>
            <Icon name="upload" className="h-4 w-4" />
            {logoUrl ? "Change logo" : "Upload logo"}
          </Button>
          {logoUrl && <Button variant="danger-quiet" loading={remove.isPending} onClick={() => remove.mutate(undefined, { onSuccess: () => toast("Logo removed") })}>Remove</Button>}
        </div>
      </div>
      {error && <div className="mt-3"><Alert tone="danger">{error}</Alert></div>}
    </Card>
  );
}

function SchoolForm({ initial }: { initial: SchoolProfile }) {
  const [form, setForm] = useState({ name: initial.name, motto: initial.motto ?? "", address: initial.address ?? "" });
  const save = useSaveSchool();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate({ name: form.name, motto: form.motto || null, address: form.address || null }, { onSuccess: () => toast("School details saved") });
  };
  return (
    <Card title="School" description="Shown on report cards and in every portal.">
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <TextField label="School name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} error={fieldError(save.error, "name")} />
        <TextField label="Motto" value={form.motto} onChange={(e) => setForm((f) => ({ ...f, motto: e.target.value }))} hint="Printed under the name on report cards." />
        <TextField label="Address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
        {generalError(save.error) && <Alert tone="danger">{generalError(save.error)}</Alert>}
        <div><Button type="submit" loading={save.isPending}>Save changes</Button></div>
      </form>
    </Card>
  );
}

function NumbersTab() {
  const numbers = useAdmissionNumbers();
  if (numbers.isPending) return <PageSpinner />;
  if (numbers.error) return <Alert tone="danger">{numbers.error.message}</Alert>;
  return <NumbersForm initial={numbers.data} />;
}

/** The school's admission number format (F-40), previewed as it is typed. */
function NumbersForm({ initial }: { initial: AdmissionNumberSettings }) {
  const [form, setForm] = useState({ pattern: initial.pattern, digits: String(initial.digits), next: String(initial.next) });
  const save = useSaveAdmissionNumbers();
  const format = { pattern: form.pattern, digits: Number(form.digits) };
  const problems = admissionPatternProblems(format);
  const next = Number(form.next);
  const year = initial.year ?? new Date().getFullYear();
  const preview = problems.length ? null : formatAdmissionNo(format, year, Number.isInteger(next) && next > 0 ? next : 1);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate({ ...format, next }, { onSuccess: (saved) => toast(`Saved. The next student gets ${saved.preview}`) });
  };
  return (
    <Card title="Admission numbers" description="New students get the next number automatically. You can still type one by hand when enrolling.">
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <TextField label="Format" value={form.pattern} onChange={(e) => setForm((f) => ({ ...f, pattern: e.target.value }))} spellCheck={false} autoComplete="off" error={problems[0] ?? fieldError(save.error, "pattern")} hint="{YEAR} becomes the session's first year and {NUMBER} the running count, e.g. SA/{YEAR}/{NUMBER}." />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Digits in the number" value={form.digits} onChange={(e) => setForm((f) => ({ ...f, digits: e.target.value }))}>
            {[1, 2, 3, 4, 5, 6].map((d) => <option key={d} value={d}>{d} ({"0".repeat(d - 1)}1)</option>)}
          </SelectField>
          <TextField label="Next number" inputMode="numeric" value={form.next} onChange={(e) => setForm((f) => ({ ...f, next: e.target.value.replace(/D/g, "") }))} error={fieldError(save.error, "next")} hint="Raise it if you already gave out numbers outside Brillanda." />
        </div>
        <p className="rounded-2xl bg-sunken p-3.5 text-sm" aria-live="polite">
          {preview ? <>The next student gets <b className="font-semibold tabular-nums">{preview}</b></> : "Fix the format to see the next number."}
        </p>
        {generalError(save.error) && <Alert tone="danger">{generalError(save.error)}</Alert>}
        <div><Button type="submit" disabled={problems.length > 0} loading={save.isPending}>Save format</Button></div>
      </form>
    </Card>
  );
}

function ScaleTab() {
  const scale = useGradingScale();
  if (scale.isPending) return <PageSpinner />;
  if (scale.error) return <Alert tone="danger">{scale.error.message}</Alert>;
  return <ScaleEditor key={JSON.stringify(scale.data.bands)} initial={scale.data.bands} />;
}

type DraftBand = { grade: string; minScore: string; remark: string; isPass: boolean };

/** Rules the scale must follow (F-1): a band at 0, one starting point and one letter per grade. */
function problemsOf(bands: DraftBand[]): string[] {
  const problems: string[] = [];
  const mins = bands.map((b) => Number(b.minScore));
  const outOfRange = (m: number) => Number.isNaN(m) || m < 0 || m > 100;
  if (mins.some(outOfRange)) problems.push("Every “From” needs a number from 0 to 100.");
  if (!mins.includes(0)) problems.push("Add a grade that starts at 0, so every total gets a grade.");
  if (new Set(mins).size !== mins.length) problems.push("Two grades start at the same total. Give each one its own starting point.");
  const letters = bands.map((band) => band.grade.trim().toUpperCase());
  if (letters.some((l) => !l)) problems.push("Every grade needs a letter.");
  if (new Set(letters).size !== letters.length) problems.push("Two grades use the same letter.");
  return problems;
}

function ScaleEditor({ initial }: { initial: GradeBand[] }) {
  const toDraft = (bands: GradeBand[]) => bands.map((band) => ({ ...band, minScore: String(band.minScore) }));
  const [draft, setDraft] = useState<DraftBand[]>(() => toDraft(initial));
  const [tryValue, setTryValue] = useState("69.5");
  const save = useSaveScale();
  const problems = problemsOf(draft);
  const parsed: GradeBand[] = draft.map((b) => ({ grade: b.grade.trim().toUpperCase(), minScore: Number(b.minScore), remark: b.remark.trim(), isPass: b.isPass }));
  const tried = Number(tryValue);
  let tryResult = "Type a total from 0 to 100";
  if (!problems.length && tryValue !== "" && !Number.isNaN(tried)) {
    const band = resolveGrade(Math.round(tried * 100) / 100, parsed);
    tryResult = `gets ${band.grade}, ${band.remark}`;
  }
  const update = (i: number, key: keyof DraftBand, value: string | boolean) => setDraft((d) => d.map((b, k) => (k === i ? { ...b, [key]: value } : b)));

  return (
    <Card title="Grading scale" description="A total gets the highest grade it reaches. Totals are rounded to two decimal places first, so 69.995 counts as 70.">
      <div className="grid gap-2">
        <div className="grid grid-cols-[4.5rem_6.5rem_minmax(0,1fr)_2.5rem] gap-2 text-[12.5px] text-text-muted"><span>Grade</span><span>From</span><span>Remark on report cards</span><span /></div>
        {draft.map((band, i) => (
          <div key={i} className="grid grid-cols-[4.5rem_6.5rem_minmax(0,1fr)_2.5rem] items-center gap-2">
            {(["grade", "minScore", "remark"] as const).map((key) => (
              <input
                key={key}
                aria-label={key === "grade" ? "Grade letter" : key === "minScore" ? `Lowest total for ${band.grade || "this grade"}` : `Remark for ${band.grade || "this grade"}`}
                value={band[key]}
                inputMode={key === "minScore" ? "decimal" : undefined}
                maxLength={key === "grade" ? 2 : undefined}
                onChange={(e) => update(i, key, e.target.value)}
                className="min-h-[42px] min-w-0 rounded-xl border-0 bg-sunken px-3 text-[15px] focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
              />
            ))}
            <button type="button" aria-label={`Remove ${band.grade || "this grade"}`} onClick={() => setDraft((d) => d.filter((_, k) => k !== i))} className="grid h-10 w-10 place-items-center rounded-full bg-raise text-text-secondary shadow-raised hover:text-danger">
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>
            </button>
          </div>
        ))}
        <div><Button size="sm" variant="secondary" onClick={() => setDraft((d) => [...d, { grade: "", minScore: "", remark: "", isPass: true }])}><Icon name="plus" className="h-4 w-4" />Add a grade</Button></div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-sunken p-3.5 text-sm">
        <label htmlFor="try-total">Try a total</label>
        <input id="try-total" value={tryValue} onChange={(e) => setTryValue(e.target.value)} inputMode="decimal" className="min-h-[40px] w-24 rounded-xl border-0 bg-surface px-3 focus:outline-none focus:ring-2 focus:ring-accent" />
        <span aria-live="polite">{problems.length ? "Fix the scale to try it" : tryResult}</span>
      </div>
      {problems.length > 0 && <ul className="mt-3 grid gap-1 text-sm text-danger">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}
      {save.error && <div className="mt-3"><Alert tone="danger">{generalError(save.error) ?? "Check the scale and try again."}</Alert></div>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button disabled={problems.length > 0} loading={save.isPending} onClick={() => save.mutate({ bands: parsed }, { onSuccess: () => toast("Grading scale saved. Every total has been regraded") })}>Save scale</Button>
        <Button variant="secondary" onClick={() => setDraft(toDraft(initial))}>Undo changes</Button>
      </div>
      <p className="mt-3 text-[12.5px] text-text-secondary">This scale applies to this session. Report cards already published keep the scale they were printed with.</p>
    </Card>
  );
}

function TermTab() {
  const term = useTermDates();
  if (term.isPending) return <PageSpinner />;
  if (term.error) return <Alert tone="danger">{term.error.message}</Alert>;
  // Keyed so the form starts afresh when a new term begins.
  return <TermForm key={term.data.startsOn} initial={term.data} />;
}

function TermForm({ initial }: { initial: TermDates }) {
  const [form, setForm] = useState({ ...initial, nextTermBegins: initial.nextTermBegins ?? "" });
  const save = useSaveTerm();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate({ ...form, nextTermBegins: form.nextTermBegins || null }, { onSuccess: () => toast("Term dates saved") });
  };
  const field = (key: keyof typeof form, label: string, hint?: string) => (
    <TextField label={label} type="date" value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} error={fieldError(save.error, key)} hint={hint} />
  );
  return (
    <Card title="This term's dates" description="Change them if the calendar moves.">

      <form onSubmit={submit} className="grid gap-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">{field("startsOn", "Term starts")}{field("endsOn", "Term ends")}</div>
        {field("scoresDueOn", "Scores due", "Teachers see this on their home screen and get a reminder three days before.")}
        {field("nextTermBegins", "Next term begins", "Printed at the bottom of report cards.")}
        {generalError(save.error) && <Alert tone="danger">{generalError(save.error)}</Alert>}
        <div><Button type="submit" loading={save.isPending}>Save dates</Button></div>
      </form>
    </Card>
  );
}

function LookTab() {
  const { look, setLook } = useLook();
  return (
    <Card title="Look" description="Pastel, or Neutral in black, greys and white. Kept on this device for now.">
      <div role="group" aria-label="Look" className="inline-grid grid-cols-2 gap-1 rounded-full bg-sunken p-1">
        {(["pastel", "neutral"] as const).map((value) => (
          <button key={value} type="button" aria-pressed={look === value} onClick={() => setLook(value)} className={cx("h-9 rounded-full px-5 text-sm font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent", look === value ? "bg-raise text-text-primary shadow-raised" : "text-text-secondary hover:text-text-primary")}>
            {value}
          </button>
        ))}
      </div>
    </Card>
  );
}
