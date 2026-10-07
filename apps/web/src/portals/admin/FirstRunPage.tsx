import { useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { computeSubjectTotal, ordinal, rankScores, resolveGrade, type EntryState, type ScoreSheet, type SetupStatus } from "@brillanda/shared-types";
import { useAuthStore } from "../../shared/auth/authStore";
import { fieldError, generalError } from "../../shared/auth/LoginPage";
import { Alert } from "../../shared/components/Alert";
import { Badge, gradeTone } from "../../shared/components/Badge";
import { Button } from "../../shared/components/Button";
import { Kbd } from "../../shared/components/EmptyState";
import { PageSpinner } from "../../shared/components/Spinner";
import { SelectField, TextAreaField } from "../../shared/components/TextField";
import { levelStyle } from "../../shared/theme/levels";
import { cx } from "../../shared/utils/cx";
import { plural } from "../../shared/utils/time";
import { ScoreGrid, type RowTotal } from "../teacher/score-entry/ScoreGrid";
import { useScoreCells, valuesOf } from "../teacher/score-entry/useScoreCells";
import { useArms, useFinishFirstRun, useSetup, useTryClass } from "./api";

// A new school's first run (Onboarding Flow §3, steps 2 to 4; DECISIONS.md F-39): what was set up
// for them, one class with a few names, then the real score grid. Nothing here has to be filled in;
// the rest of setup waits on the home screen as a checklist.

const STEPS = ["Your school", "One class", "Try it"];

export function FirstRunPage() {
  const setup = useSetup();
  const [step, setStep] = useState(0);
  const [sheet, setSheet] = useState<ScoreSheet | null>(null);

  if (setup.isPending) return <PageSpinner />;
  if (setup.error) return <Alert tone="danger">{setup.error.message}</Alert>;

  return (
    <div className="min-h-screen bg-bg px-4 pb-16 pt-6 sm:px-8">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <span className="inline-flex items-center gap-2.5 text-lg font-semibold tracking-[-0.02em]">
          <span aria-hidden className="h-7 w-7 rounded-[9px]" style={{ background: "var(--brand-mark)" }} />
          Brillanda
        </span>
        <StepDots step={step} />
      </header>
      <main className={cx("mx-auto mt-10 sm:mt-14", step === 2 ? "max-w-6xl" : "max-w-2xl")}>
        {step === 0 && <Welcome defaults={setup.data.defaults} onNext={() => setStep(1)} />}
        {step === 1 && <OneClass onBack={() => setStep(0)} onReady={(s) => { setSheet(s); setStep(2); }} />}
        {step === 2 && sheet && <TryIt key={sheet.arm.id + sheet.subject.id} sheet={sheet} onBack={() => setStep(1)} />}
      </main>
    </div>
  );
}

function StepDots({ step }: { step: number }) {
  return (
    <ol className="flex items-center gap-2 text-[13px]" aria-label="Setup steps">
      {STEPS.map((label, i) => (
        <li key={label} aria-current={i === step ? "step" : undefined} className="flex items-center gap-2">
          <span className={cx("h-2 rounded-full transition-all duration-300", i === step ? "w-6 bg-primary" : i < step ? "w-2 bg-accent" : "w-2 bg-text-muted opacity-40")} />
          <span className={cx("hidden sm:inline", i === step ? "font-medium text-text-primary" : "text-text-muted")}>{label}</span>
        </li>
      ))}
    </ol>
  );
}

/** Skipping ahead, or finishing, ends the first run for good and opens the dashboard or a page in it. */
function useFinish() {
  const finish = useFinishFirstRun();
  const navigate = useNavigate();
  return { pending: finish.isPending, error: finish.error, go: (to: string) => finish.mutate(undefined, { onSuccess: () => navigate(to, { replace: true }) }) };
}

function Welcome({ defaults, onNext }: { defaults: SetupStatus["defaults"]; onNext: () => void }) {
  const user = useAuthStore((state) => state.user);
  const finish = useFinish();
  const [ca, exam] = [defaults.components.filter((c) => !/exam/i.test(c.name)), defaults.components.filter((c) => /exam/i.test(c.name))];
  const share = (list: typeof defaults.components) => list.reduce((n, c) => n + c.weight, 0);
  const top = defaults.gradingScale[0];

  const tiles: { title: string; detail: string; level: number }[] = [
    { title: plural(defaults.terms.length, "term"), detail: `${defaults.terms.join(", ")}. Session ${defaults.sessionName}.`, level: 2 },
    { title: plural(defaults.classes.length * defaults.arms.length, "class", "classes"), detail: `${defaults.classes[0]} to ${defaults.classes.at(-1)}, arms ${defaults.arms.join(" and ")}.`, level: 0 },
    { title: plural(defaults.subjects.length, "subject"), detail: `${defaults.subjects.slice(0, 2).join(", ")} and ${defaults.subjects.length - 2} more.`, level: 3 },
    { title: `CA ${share(ca)}%, exam ${share(exam)}%`, detail: `${defaults.components.map((c) => `${c.name} ${c.maxScore}`).join(", ")}. Grades ${top?.grade} (${top?.minScore}+) to ${defaults.gradingScale.at(-1)?.grade}.`, level: 5 },
  ];

  return (
    <section className="animate-pop">
      <p className="text-sm text-text-secondary">Welcome{user ? `, ${user.fullName.split(" ")[0]}` : ""}</p>
      <h1 className="mt-2 text-[34px] font-medium leading-[1.1] tracking-[-0.035em] sm:text-[44px]">{user?.school?.name ?? "Your school"} is ready to use.</h1>
      <p className="mt-4 max-w-[52ch] text-[17px] leading-relaxed text-text-secondary">
        We've set you up with the usual structure for a Nigerian secondary school, so you can start straight away. You can change any of it later in Settings.
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2">
        {tiles.map((tile, i) => (
          <li key={tile.title} className="animate-pop rounded-[22px] p-[18px]" style={{ ...levelStyle(tile.level), background: "var(--tint)", color: "var(--deep)", ["--d" as string]: `${0.08 + i * 0.06}s` }}>
            <b className="block text-[19px] font-semibold tracking-[-0.02em]">{tile.title}</b>
            <span className="mt-1 block text-[13.5px] opacity-85">{tile.detail}</span>
          </li>
        ))}
      </ul>
      <div className="mt-10 grid gap-3 sm:flex sm:items-center">
        <Button size="lg" onClick={onNext}>Try it with one class</Button>
        <Button size="lg" variant="ghost" loading={finish.pending} onClick={() => finish.go("/admin")}>I have a spreadsheet, skip ahead</Button>
      </div>
      <p className="mt-3 text-[13px] text-text-muted">Trying it takes about two minutes.</p>
      {finish.error && <div className="mt-4"><Alert tone="danger">{finish.error.message}</Alert></div>}
    </section>
  );
}

function OneClass({ onBack, onReady }: { onBack: () => void; onReady: (sheet: ScoreSheet) => void }) {
  const arms = useArms();
  const tryClass = useTryClass();
  const [armId, setArmId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [names, setNames] = useState("");

  if (arms.isPending) return <PageSpinner />;
  if (arms.error) return <Alert tone="danger">{arms.error.message}</Alert>;

  const list = arms.data;
  const arm = armId || list[0]?.id || "";
  const subjects = list[0]?.subjects ?? [];
  const subject = subjectId || subjects[0]?.subjectId || "";
  const lines = names.split(/\r?\n/).map((n) => n.trim()).filter(Boolean);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    tryClass.mutate({ armId: arm, subjectId: subject, studentNames: lines }, { onSuccess: (response) => onReady(response.sheet) });
  };

  return (
    <form onSubmit={submit} noValidate className="animate-pop">
      <h1 className="text-[34px] font-medium leading-[1.1] tracking-[-0.035em] sm:text-[40px]">Try it with one class.</h1>
      <p className="mt-3 max-w-[52ch] text-[17px] leading-relaxed text-text-secondary">Just enough to show you how it works. You'll import your full list next.</p>
      <div className="mt-8 grid gap-5 rounded-3xl bg-surface p-5 shadow-raised sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField label="Class" value={arm} onChange={(e) => setArmId(e.target.value)} error={fieldError(tryClass.error, "armId")}>
            {list.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </SelectField>
          <SelectField label="Subject" value={subject} onChange={(e) => setSubjectId(e.target.value)} error={fieldError(tryClass.error, "subjectId")}>
            {subjects.map((s) => <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>)}
          </SelectField>
        </div>
        <TextAreaField
          label="Five student names"
          rows={6}
          value={names}
          onChange={(e) => setNames(e.target.value)}
          placeholder={"Chidera Okafor\nTunde Bello\nAmina Yusuf\nEmeka Obi\nFolake Adeyemi"}
          error={fieldError(tryClass.error, "studentNames")}
          hint={lines.length ? `${plural(lines.length, "name")}. Each gets the next admission number.` : "One name per line. You can paste a column from a spreadsheet."}
        />
        {generalError(tryClass.error) && !fieldError(tryClass.error, "studentNames") && <Alert tone="danger">{generalError(tryClass.error)}</Alert>}
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" loading={tryClass.isPending} disabled={!lines.length}>Show me</Button>
        <Button type="button" size="lg" variant="ghost" onClick={onBack}>Back</Button>
      </div>
    </form>
  );
}

function TryIt({ sheet, onBack }: { sheet: ScoreSheet; onBack: () => void }) {
  const [, setStatus] = useState<EntryState>(sheet.status);
  const cells = useScoreCells(sheet, setStatus);
  const finish = useFinish();
  const exam = sheet.components.find((c) => /exam/i.test(c.name)) ?? sheet.components.at(-1)!;

  const totals = useMemo<RowTotal[]>(
    () =>
      sheet.rows.map((row) => {
        const values = valuesOf(cells.views[row.studentId]);
        return { ...computeSubjectTotal(sheet.components, values), anyEntered: Object.values(values).some(Boolean) };
      }),
    [sheet, cells.views],
  );
  const done = totals.filter((t) => t.complete).length;

  return (
    <section className="animate-pop">
      <h1 className="text-[34px] font-medium leading-[1.1] tracking-[-0.035em] sm:text-[40px]">Type their {sheet.subject.name} scores.</h1>
      <p className="mt-3 max-w-[60ch] text-[17px] leading-relaxed text-text-secondary">
        Totals, grades and positions work themselves out as you type. Press <Kbd>Enter</Kbd> to go down, <Kbd>Tab</Kbd> to go across. Try typing 95 in the {exam.name} column, which is out of {exam.maxScore}.
      </p>

      <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="min-w-0">
          <ScoreGrid sheet={sheet} views={cells.views} totals={totals} readOnly={false} onCommit={cells.commit} />
        </div>
        <aside className="grid gap-4 lg:sticky lg:top-8 lg:w-80 lg:shrink-0">
          <Ranking sheet={sheet} totals={totals} />
          <div className="grid gap-3 rounded-3xl bg-surface p-5 shadow-raised">
            {done === sheet.rows.length && sheet.rows.length > 0 ? (
              <p className="text-[15px] font-medium">That's Brillanda. Every class and every subject, worked out like this.</p>
            ) : (
              <p className="text-sm text-text-secondary">{done} of {sheet.rows.length} students done. Scores save as you go.</p>
            )}
            <Button loading={finish.pending} onClick={() => finish.go("/admin/students/import")}>Import your full student list</Button>
            <Button variant="ghost" disabled={finish.pending} onClick={() => finish.go("/admin")}>Go to your dashboard</Button>
            {finish.error && <Alert tone="danger">{finish.error.message}</Alert>}
          </div>
          <button type="button" onClick={onBack} className="justify-self-start rounded px-1 text-sm text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            Change the class or names
          </button>
        </aside>
      </div>
    </section>
  );
}

/** The class in order, live: positions appear as each student's total is complete. */
function Ranking({ sheet, totals }: { sheet: ScoreSheet; totals: RowTotal[] }) {
  const rows = sheet.rows.map((row, i) => ({ ...row, ...totals[i]! }));
  const complete = rows.filter((r) => r.complete);
  const positions = rankScores(complete.map((r) => ({ id: r.studentId, total: r.total })));
  const ordered = [...complete.sort((a, b) => positions.get(a.studentId)! - positions.get(b.studentId)!), ...rows.filter((r) => !r.complete)];

  return (
    <section className="rounded-3xl bg-surface p-5 shadow-raised" aria-labelledby="ranking-title">
      <h2 id="ranking-title" className="text-[17px] font-semibold tracking-[-0.02em]">Position in {sheet.arm.name}</h2>
      <p className="mt-0.5 text-[13px] text-text-secondary">For {sheet.subject.name}. Report cards rank by the average of every subject.</p>
      <ol className="mt-4 grid gap-1.5" aria-live="polite">
        {ordered.map((row) => {
          const position = positions.get(row.studentId);
          const band = row.complete ? resolveGrade(row.total, sheet.gradingScale) : null;
          return (
            <li key={row.studentId} className="grid grid-cols-[2.6rem_minmax(0,1fr)_auto] items-center gap-2 rounded-xl px-2 py-1.5 text-sm transition-colors">
              <b className={cx("tabular-nums", position ? "font-semibold" : "font-normal text-text-muted")}>{position ? ordinal(position) : "—"}</b>
              <span className="truncate">{row.fullName}</span>
              {band ? (
                <span className="flex items-center gap-2">
                  <span className="tabular-nums text-text-secondary">{row.total}</span>
                  <Badge tone={gradeTone(band, sheet.gradingScale)}>{band.grade}</Badge>
                </span>
              ) : (
                <span className="text-[12.5px] text-text-muted">waiting</span>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
