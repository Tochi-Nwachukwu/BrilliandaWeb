"use client";

import { armCode, armLayoutSchema, SECTION_LABEL, type Section } from "@brillianda/core/classes";
import { Alert } from "@brillianda/ui/Alert";
import { Button } from "@brillianda/ui/Button";
import { cx } from "@brillianda/ui/cx";
import { Icon } from "@brillianda/ui/Icon";
import { PageHeader } from "@brillianda/ui/PageHeader";
import { TextField } from "@brillianda/ui/TextField";
import { toast } from "@brillianda/ui/Toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ActionResult, ClassStructure } from "@/data/types";
import { firstErrors, type Errors } from "@/lib/form";
import { errorsFor } from "@/lib/formCheck";

type Row = { key: string; name: string; code: string; codeTouched: boolean; levels: Set<string> };

const SECTIONS: Section[] = ["preschool", "primary", "junior", "senior"];
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * Classes › Edit arms: every arm in one place. Rename, reorder, add, delete, and pick the classes
 * that have each arm, then save once. Arms with students stay put: they can't be unticked here.
 */
export function ArmsEditor({ school, structure, save }: { school: string; structure: ClassStructure; save: (input: unknown) => Promise<ActionResult<{ summary: string }>> }) {
  const router = useRouter();
  const levels = structure.levels.filter((l) => !l.archived);
  const armIn = (levelId: string, armNameId: string) => structure.arms.find((a) => a.levelId === levelId && a.armNameId === armNameId);
  const studentsIn = (levelId: string, key: string) => armIn(levelId, key)?.studentCount ?? 0;
  const studentsUnder = (key: string) => structure.arms.filter((a) => a.armNameId === key).reduce((n, a) => n + a.studentCount, 0);

  const [rows, setRows] = useState<Row[]>(() =>
    structure.armNames.map((n) => ({
      key: n.id,
      name: n.name,
      code: n.code,
      codeTouched: true,
      levels: new Set(levels.filter((l) => { const arm = armIn(l.id, n.id); return arm && !arm.archived; }).map((l) => l.id)),
    })),
  );
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [newCount, setNewCount] = useState(1);

  const update = (index: number, patch: Partial<Row>) => {
    setRows((all) => all.map((row, i) => (i === index ? { ...row, ...patch } : row)));
    setErrors({});
    setFailure(null);
  };
  const toggle = (index: number, levelId: string) => {
    const levelsNow = new Set(rows[index]!.levels);
    if (levelsNow.has(levelId)) levelsNow.delete(levelId);
    else levelsNow.add(levelId);
    update(index, { levels: levelsNow });
  };
  const move = (index: number, by: -1 | 1) => {
    setRows((all) => {
      const next = [...all];
      const [row] = next.splice(index, 1);
      next.splice(index + by, 0, row!);
      return next;
    });
  };
  const add = () => {
    setRows((all) => [...all, { key: `new-${newCount}`, name: "", code: "", codeTouched: false, levels: new Set(levels.map((l) => l.id)) }]);
    setNewCount((n) => n + 1);
    // Focus the new arm's name once it's on the screen.
    requestAnimationFrame(() => document.getElementById(`arm-name-new-${newCount}`)?.focus());
  };
  const remove = (index: number) => {
    setRows((all) => all.filter((_, i) => i !== index));
    setErrors({});
  };

  const layout = {
    names: rows.map((r) => ({ key: r.key, name: r.name, code: r.code })),
    levels: levels.map((l) => ({ levelId: l.id, arms: rows.filter((r) => r.levels.has(l.id)).map((r) => r.key) })),
  };
  const emptyLevels = levels.filter((l) => !rows.some((r) => r.levels.has(l.id)));
  const classCount = layout.levels.reduce((n, l) => n + l.arms.length, 0);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setFailure(null);
    const problems = errorsFor(armLayoutSchema, layout);
    if (problems) {
      setErrors(problems);
      setFailure(emptyLevels.length ? `Give ${emptyLevels.map((l) => l.name).join(", ")} at least one arm.` : "Please check the highlighted arms.");
      return;
    }
    startTransition(async () => {
      const result = await save(layout);
      if (!result.ok) {
        setErrors(firstErrors(result.fieldErrors));
        setFailure(result.error);
        return;
      }
      toast(result.data.summary === "no changes" ? "Nothing changed" : "Arms saved");
      router.push(`/s/${school}/classes`);
      router.refresh();
    });
  };

  return (
    <form noValidate onSubmit={submit} className="grid gap-4">
      <PageHeader
        title="Edit arms"
        actions={
          <Link href={`/s/${school}/classes`} className="inline-flex min-h-[44px] items-center rounded-full px-4 text-sm font-medium text-text-secondary hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
            Cancel
          </Link>
        }
      >
        Name your arms, put them in order, and tick the classes that have each one. A name lives once for the whole school, so renaming it renames it in every class.
      </PageHeader>

      <ol className="grid gap-3">
        {rows.map((row, index) => {
          const total = studentsUnder(row.key);
          const isNew = row.key.startsWith("new-");
          return (
            <li key={row.key} className="grid gap-4 rounded-3xl bg-surface p-5 shadow-raised sm:p-6" aria-label={row.name || "New arm"}>
              <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-3 sm:grid-cols-[minmax(0,1fr)_7rem_auto] sm:items-start">
                <TextField
                  id={`arm-name-${row.key}`}
                  label="Arm name"
                  value={row.name}
                  placeholder="e.g. Purple"
                  onChange={(e) => update(index, { name: e.target.value, ...(row.codeTouched ? {} : { code: armCode(e.target.value) }) })}
                  error={errors[`names.${index}.name`]}
                />
                <TextField
                  label="Code"
                  value={row.code}
                  maxLength={4}
                  autoCapitalize="characters"
                  spellCheck={false}
                  onChange={(e) => update(index, { code: e.target.value.toUpperCase(), codeTouched: true })}
                  error={errors[`names.${index}.code`]}
                />
                <div className="col-span-2 flex items-center gap-1 sm:col-span-1 sm:mt-[26px]">
                  <Button type="button" size="sm" variant="ghost" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move ${row.name || "this arm"} up`}>
                    <Icon name="chevron" className="h-4 w-4 -rotate-90" />
                  </Button>
                  <Button type="button" size="sm" variant="ghost" disabled={index === rows.length - 1} onClick={() => move(index, 1)} aria-label={`Move ${row.name || "this arm"} down`}>
                    <Icon name="chevron" className="h-4 w-4 rotate-90" />
                  </Button>
                  <Button type="button" size="sm" variant="danger-quiet" disabled={total > 0 || rows.length === 1} onClick={() => remove(index)} className="ml-auto sm:ml-0">
                    Delete
                  </Button>
                </div>
              </div>

              <fieldset className="grid gap-2.5">
                <legend className="mb-2.5 flex w-full flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium">
                    In {plural(row.levels.size, "class", "classes")}
                    {total > 0 && <span className="font-normal text-text-secondary"> · {plural(total, "student")}</span>}
                    {isNew && <span className="font-normal text-text-secondary"> · new</span>}
                  </span>
                  <span className="flex gap-3">
                    <button type="button" onClick={() => update(index, { levels: new Set([...levels.map((l) => l.id)]) })} className="font-medium text-accent underline underline-offset-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
                      All classes
                    </button>
                    <button
                      type="button"
                      onClick={() => update(index, { levels: new Set(levels.filter((l) => studentsIn(l.id, row.key) > 0).map((l) => l.id)) })}
                      className="font-medium text-accent underline underline-offset-2 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      None
                    </button>
                  </span>
                </legend>
                {SECTIONS.map((section) => {
                  const inSection = levels.filter((l) => l.section === section);
                  if (!inSection.length) return null;
                  return (
                    <div key={section} className="grid gap-1.5">
                      <span className="text-[12.5px] text-text-secondary">{SECTION_LABEL[section]}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {inSection.map((level) => {
                          const on = row.levels.has(level.id);
                          const students = studentsIn(level.id, row.key);
                          const locked = on && students > 0;
                          return (
                            <button
                              key={level.id}
                              type="button"
                              aria-pressed={on}
                              disabled={locked}
                              title={locked ? `${level.name} ${row.name} has ${plural(students, "student")}. Move them first to take it out.` : undefined}
                              onClick={() => toggle(index, level.id)}
                              className={cx(
                                "inline-flex min-h-[40px] items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent",
                                on ? "bg-primary text-primary-text" : "bg-raise text-text-secondary shadow-raised hover:bg-hover",
                                locked && "cursor-not-allowed",
                              )}
                            >
                              {on && <Icon name="check" className="h-3.5 w-3.5" />}
                              {level.short}
                              {students > 0 && <span className="font-normal">· {students}</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </fieldset>
              {total > 0 && <p className="text-[13px] text-text-secondary">Classes with students can’t be unticked here. Move the students first, or archive the class from the Classes page.</p>}
            </li>
          );
        })}
      </ol>

      <Button type="button" variant="secondary" onClick={add} className="justify-self-start" disabled={rows.length >= 26}>
        <Icon name="plus" className="h-4 w-4" />
        Add an arm
      </Button>

      {emptyLevels.length > 0 && <Alert tone="warning">{emptyLevels.map((l) => l.name).join(", ")} {emptyLevels.length === 1 ? "has" : "have"} no arm. Every class needs at least one.</Alert>}
      {failure && <Alert tone="danger">{failure}</Alert>}

      <div className="sticky bottom-[92px] z-10 flex items-center justify-between gap-2 rounded-[22px] bg-[color-mix(in_oklab,var(--color-surface)_92%,transparent)] p-2 pl-4 shadow-float backdrop-blur-md md:bottom-3">
          <p className="text-sm text-text-secondary" aria-live="polite">
            {plural(rows.length, "arm")}, {plural(classCount, "class", "classes")} in all
          </p>
          <Button type="submit" loading={pending}>
            Save arms
          </Button>
      </div>
    </form>
  );
}
