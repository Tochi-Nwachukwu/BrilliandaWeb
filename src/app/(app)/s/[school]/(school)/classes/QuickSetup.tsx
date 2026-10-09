"use client";

import { ARM_PRESETS, armChip, armCodes, buildLadder, classLevelsStepSchema, classSetupSchema, defaultRange, ladderOptions, MAX_ARMS, previewSentence, renameLadder, SCHEME_LABEL, SECTION_LABEL, setupLabels, type ArmPreset, type ClassLevelDraft, type LadderKey, type NamingScheme } from "@brillianda/core/classes";
import { type SchoolLevel } from "@brillianda/core/signup";
import { Alert } from "@brillianda/ui/Alert";
import { Button } from "@brillianda/ui/Button";
import { Card } from "@brillianda/ui/Cards";
import { cx } from "@brillianda/ui/cx";
import { Icon } from "@brillianda/ui/Icon";
import { PageHeader } from "@brillianda/ui/PageHeader";
import { Stepper } from "@brillianda/ui/Stepper";
import { SelectField } from "@brillianda/ui/TextField";
import { toast } from "@brillianda/ui/Toast";
import { useRouter } from "next/navigation";
import { useState, useTransition, type KeyboardEvent } from "react";
import { FormError } from "@/components/auth/FormError";
import { errorsFor } from "@/lib/formCheck";
import { firstErrors, type Errors } from "@/lib/form";
import type { ActionResult } from "@/data/types";

type Names = ArmPreset | "own";

const chipClass = (on: boolean) =>
  cx(
    "inline-flex min-h-[40px] items-center rounded-full px-4 text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent",
    on ? "bg-primary text-primary-text" : "bg-raise shadow-raised hover:bg-hover",
  );

const inputClass = (error?: string) =>
  cx(
    "min-h-[42px] w-full rounded-[12px] border-0 px-3 text-base focus:outline-hidden focus:ring-2",
    error ? "bg-danger-bg ring-2 ring-danger" : "bg-sunken focus:bg-surface focus:ring-accent",
  );

/** The plan's quick setup: two answers produce the whole class list. */
export function QuickSetup({ levelsOffered, setup }: { levelsOffered: SchoolLevel[]; setup: (input: unknown) => Promise<ActionResult<null>> }) {
  const router = useRouter();
  const range = defaultRange(levelsOffered);
  const [step, setStep] = useState<1 | 2>(1);
  const [scheme, setScheme] = useState<NamingScheme>("nigerian");
  const [first, setFirst] = useState<LadderKey>(range.first);
  const [last, setLast] = useState<LadderKey>(range.last);
  const [levels, setLevels] = useState<ClassLevelDraft[]>(() => buildLadder(range.first, range.last, "nigerian"));
  const [names, setNames] = useState<Names>("letters");
  const [ownNames, setOwnNames] = useState<string[]>([]);
  const [draftName, setDraftName] = useState("");
  const [count, setCount] = useState(2);
  const [codes, setCodes] = useState<Record<number, string>>({});
  const [armsByLevel, setArmsByLevel] = useState<number[][]>(() => levels.map(() => [0, 1]));
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const options = ladderOptions(scheme);
  const customLevels = levels.filter((l) => !l.key);

  const rebuild = (nextFirst: LadderKey, nextLast: LadderKey, nextScheme: NamingScheme) => {
    const built = buildLadder(nextFirst, nextLast, nextScheme);
    setLevels([...built, ...customLevels]);
    setErrors({});
  };
  const changeScheme = (next: NamingScheme) => {
    setScheme(next);
    const offered = ladderOptions(next).map((o) => o.key);
    // A scheme may leave a place out (British has no Nursery 3): keep the range inside it.
    const fix = (key: LadderKey) => (offered.includes(key) ? key : offered[Math.min(offered.length - 1, ladderOptions("nigerian").findIndex((o) => o.key === key))]!);
    const f = fix(first);
    const l = fix(last);
    setFirst(f);
    setLast(l);
    setLevels(renameLadder(levels, next));
    setErrors({});
  };
  const setLevel = (index: number, patch: Partial<ClassLevelDraft>) => {
    setLevels((list) => list.map((l, i) => (i === index ? { ...l, ...patch } : l)));
    setErrors((e) => ({ ...e, [`levels.${index}.name`]: undefined, [`levels.${index}.short`]: undefined }));
  };

  // ——— Arms ———
  const pool: string[] = names === "own" ? ownNames : [...ARM_PRESETS[names].names];
  const defaultCodes = armCodes(pool);
  const codeOf = (i: number) => codes[i] ?? defaultCodes[i] ?? "";
  const perLevel = armsByLevel.length === levels.length ? armsByLevel : levels.map(() => Array.from({ length: count }, (_, i) => i));
  const used = Math.max(0, ...perLevel.flat().map((i) => i + 1));

  const setEveryCount = (n: number) => {
    setCount(n);
    setArmsByLevel(levels.map(() => Array.from({ length: n }, (_, i) => i)));
  };
  const setLevelCount = (levelIndex: number, n: number) =>
    setArmsByLevel(perLevel.map((list, i) => (i === levelIndex ? Array.from({ length: n }, (_, k) => k) : list)));
  const toggleCell = (levelIndex: number, armIndex: number) =>
    setArmsByLevel(
      perLevel.map((list, i) => {
        if (i !== levelIndex) return list;
        const next = list.includes(armIndex) ? list.filter((a) => a !== armIndex) : [...list, armIndex].sort((a, b) => a - b);
        return next.length ? next : list; // every class keeps at least one arm
      }),
    );
  const addOwn = () => {
    const name = draftName.trim();
    if (!name || ownNames.some((n) => n.toLowerCase() === name.toLowerCase()) || ownNames.length >= MAX_ARMS) return;
    setOwnNames((list) => [...list, name]);
    setDraftName("");
  };

  const input = { levels, arms: pool.slice(0, used).map((name, i) => ({ name, code: codeOf(i) })), armsByLevel: perLevel };
  const notEnoughNames = used > pool.length;
  const labels = notEnoughNames ? [] : setupLabels(input);

  const next = () => {
    const levelErrors = errorsFor(classLevelsStepSchema, { levels });
    if (levelErrors) {
      setErrors(levelErrors);
      return;
    }
    setArmsByLevel(levels.map(() => Array.from({ length: count }, (_, i) => i)));
    setStep(2);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const create = () => {
    setFailure(null);
    if (notEnoughNames) return setFailure(`Add ${used - pool.length} more arm ${used - pool.length === 1 ? "name" : "names"}.`);
    const problems = errorsFor(classSetupSchema, input);
    if (problems) {
      setErrors(problems);
      return setFailure(Object.values(problems).find(Boolean) ?? "Please check the arms.");
    }
    startTransition(async () => {
      const result = await setup(input);
      if (!result.ok) {
        setErrors(firstErrors(result.fieldErrors));
        setFailure(result.error);
        return;
      }
      toast(`${labels.length} classes created`);
      router.refresh();
    });
  };

  return (
    <div className="grid gap-5">
      <PageHeader title="Set up your classes">
        Step {step} of 2. {step === 1 ? "Pick your first and last class; everything in between is made in order." : "How many arms each class has, and what they’re called."}
      </PageHeader>

      {step === 1 ? (
        <>
          <Card title="Your classes" description="Rename, remove or add classes in the list. Your school’s own names are fine.">
            <div className="grid gap-5">
              <div>
                <p className="mb-2 text-sm font-medium">Naming</p>
                <div role="group" aria-label="Naming" className="flex flex-wrap gap-2">
                  {(Object.keys(SCHEME_LABEL) as NamingScheme[]).map((s) => (
                    <button key={s} type="button" aria-pressed={scheme === s} onClick={() => changeScheme(s)} className={chipClass(scheme === s)}>
                      {SCHEME_LABEL[s]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField
                  label="Our first class"
                  value={first}
                  onChange={(e) => {
                    const key = e.target.value as LadderKey;
                    setFirst(key);
                    rebuild(key, last, scheme);
                  }}
                >
                  {options.map((o) => (
                    <option key={o.key} value={o.key!}>
                      {o.name}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label="Our last class"
                  value={last}
                  onChange={(e) => {
                    const key = e.target.value as LadderKey;
                    setLast(key);
                    rebuild(first, key, scheme);
                  }}
                >
                  {options.map((o) => (
                    <option key={o.key} value={o.key!}>
                      {o.name}
                    </option>
                  ))}
                </SelectField>
              </div>

              <ol className="grid gap-1.5" aria-label="Classes">
                {levels.map((level, i) => {
                  const newSection = i === 0 || levels[i - 1]!.section !== level.section;
                  return (
                    <li key={`${level.key ?? "custom"}-${i}`}>
                      {newSection && <p className="mb-1.5 mt-2 px-1 text-xs font-medium uppercase tracking-[0.08em] text-text-secondary">{SECTION_LABEL[level.section]}</p>}
                      <div className="grid grid-cols-[minmax(0,1fr)_5.5rem_2.75rem] items-start gap-2">
                        <label className="grid gap-1">
                          <span className="sr-only">Class {i + 1} name</span>
                          <input className={inputClass(errors[`levels.${i}.name`])} value={level.name} placeholder="Class name" onChange={(e) => setLevel(i, { name: e.target.value })} />
                          {errors[`levels.${i}.name`] && <span className="text-[13px] text-danger">{errors[`levels.${i}.name`]}</span>}
                        </label>
                        <label className="grid gap-1">
                          <span className="sr-only">Class {i + 1} short name</span>
                          <input className={inputClass(errors[`levels.${i}.short`])} value={level.short} placeholder="Short" maxLength={8} onChange={(e) => setLevel(i, { short: e.target.value.toUpperCase().replace(/\s+/g, "") })} />
                        </label>
                        <button
                          type="button"
                          aria-label={`Remove ${level.name || "this class"}`}
                          disabled={levels.length === 1}
                          onClick={() => setLevels((list) => list.filter((_, k) => k !== i))}
                          className="grid h-[42px] w-[42px] place-items-center rounded-full text-text-secondary hover:bg-hover hover:text-danger disabled:opacity-40 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
                            <path d="M6 6l12 12M18 6L6 18" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ol>
              <div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setLevels((list) => [...list, { key: null, name: "", short: "", section: list.at(-1)?.section ?? "junior" }])}
                >
                  <Icon name="plus" className="h-4 w-4" />
                  Add a class
                </Button>
                <p className="mt-2 text-[13px] text-text-secondary">For a class the list doesn’t have, like Year 13 or a Pre-JSS class.</p>
              </div>
            </div>
          </Card>
          <div className="flex justify-end">
            <Button size="lg" onClick={next}>
              Next: arms
            </Button>
          </div>
        </>
      ) : (
        <>
          <Card title="Arms" description="Students sit in an arm, like JSS 1 Gold. One arm shows as plain “JSS 1”.">
            <div className="grid gap-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium" id="arms-each">
                  How many arms does each class have?
                </p>
                <Stepper label="Arms in every class" value={count} max={MAX_ARMS} onChange={setEveryCount} />
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Arm names</p>
                <div role="group" aria-label="Arm names" className="flex flex-wrap gap-2">
                  {(Object.keys(ARM_PRESETS) as ArmPreset[]).map((p) => (
                    <button key={p} type="button" aria-pressed={names === p} onClick={() => (setNames(p), setCodes({}))} className={chipClass(names === p)}>
                      {ARM_PRESETS[p].label}
                    </button>
                  ))}
                  <button type="button" aria-pressed={names === "own"} onClick={() => (setNames("own"), setCodes({}))} className={chipClass(names === "own")}>
                    Your own
                  </button>
                </div>
                {names === "own" && (
                  <div className="mt-3 grid gap-2">
                    <div className="flex gap-2">
                      <label className="min-w-0 flex-1">
                        <span className="sr-only">Arm name</span>
                        <input
                          className={inputClass()}
                          value={draftName}
                          placeholder="Type a name, then Add"
                          onChange={(e) => setDraftName(e.target.value)}
                          onKeyDown={(e: KeyboardEvent) => e.key === "Enter" && (e.preventDefault(), addOwn())}
                        />
                      </label>
                      <Button variant="secondary" onClick={addOwn}>
                        Add
                      </Button>
                    </div>
                    <p className="text-[13px] text-text-secondary">In the order you want them. Up to {MAX_ARMS}.</p>
                  </div>
                )}
              </div>

              {pool.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium">Short codes, for tight screens</p>
                  <ul className="flex flex-wrap gap-2">
                    {pool.slice(0, Math.max(used, names === "own" ? pool.length : count)).map((name, i) => (
                      <li key={name} className="flex items-center gap-2 rounded-full bg-sunken py-1 pl-3.5 pr-1 text-sm">
                        {name}
                        <label>
                          <span className="sr-only">Code for {name}</span>
                          <input
                            value={codeOf(i)}
                            maxLength={4}
                            onChange={(e) => setCodes((c) => ({ ...c, [i]: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))}
                            className={cx("h-8 w-16 rounded-full border-0 bg-surface text-center text-[13px] font-semibold uppercase focus:outline-hidden focus:ring-2 focus:ring-accent", errors[`arms.${i}.code`] && "ring-2 ring-danger")}
                          />
                        </label>
                        {names === "own" && (
                          <button type="button" aria-label={`Remove ${name}`} onClick={() => setOwnNames((list) => list.filter((n) => n !== name))} className="grid h-8 w-8 place-items-center rounded-full text-text-secondary hover:text-danger">
                            ×
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </Card>

          <Card title="Each class" description="Classes can differ: JSS 1 might have four arms while SS 3 has two.">
            {/* Phone: a stepper per class. */}
            <ul className="grid gap-1 md:hidden">
              {levels.map((level, i) => (
                <li key={`${level.name}-${i}`} className="flex items-center justify-between gap-3 rounded-2xl px-1 py-1.5">
                  <span className="min-w-0">
                    <b className="block font-semibold">{level.name}</b>
                    <span className="block truncate text-[12.5px] text-text-secondary">
                      {(perLevel[i] ?? []).map((a) => armChip(level.short, codeOf(a), perLevel[i]!.length)).join(", ")}
                    </span>
                  </span>
                  <Stepper size="sm" label={`Arms in ${level.name}`} value={perLevel[i]?.length ?? 1} max={Math.min(MAX_ARMS, Math.max(pool.length, 1))} onChange={(n) => setLevelCount(i, n)} />
                </li>
              ))}
            </ul>
            {/* Laptop: classes against arms. */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th scope="col" className="py-2 pr-3 text-left text-[12.5px] font-medium text-text-secondary">
                      Class
                    </th>
                    {pool.slice(0, Math.max(used, count)).map((name) => (
                      <th key={name} scope="col" className="px-1 py-2 text-center text-[12.5px] font-medium text-text-secondary">
                        {name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {levels.map((level, i) => (
                    <tr key={`${level.name}-${i}`} className="border-t border-divider">
                      <th scope="row" className="py-1.5 pr-3 text-left font-semibold">
                        {level.name}
                      </th>
                      {pool.slice(0, Math.max(used, count)).map((name, a) => {
                        const on = perLevel[i]?.includes(a) ?? false;
                        return (
                          <td key={name} className="px-1 py-1.5 text-center">
                            <button
                              type="button"
                              aria-pressed={on}
                              aria-label={`${level.name} ${name}`}
                              onClick={() => toggleCell(i, a)}
                              className={cx(
                                "grid h-9 w-9 place-items-center justify-self-center rounded-xl transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent",
                                on ? "bg-accent text-primary-text" : "bg-sunken text-text-muted hover:bg-hover",
                              )}
                            >
                              {on ? <Icon name="check" className="h-4 w-4" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div aria-live="polite">
            {notEnoughNames ? (
              <Alert tone="warning">Some classes need more arms than you’ve named. Add {used - pool.length} more {used - pool.length === 1 ? "name" : "names"}.</Alert>
            ) : (
              <Alert tone="info">{previewSentence(labels)}</Alert>
            )}
          </div>

          <div>
            <FormError message={failure} />
            <div className="flex flex-wrap justify-between gap-2">
              <Button variant="ghost" onClick={() => setStep(1)}>
                Back to classes
              </Button>
              <Button size="lg" loading={pending} onClick={create}>
                Create {labels.length || ""} {labels.length === 1 ? "class" : "classes"}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
