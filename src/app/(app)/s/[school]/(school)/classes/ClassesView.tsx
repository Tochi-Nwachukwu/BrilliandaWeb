"use client";

import {
  armChip,
  armNameSchema,
  DEPARTMENT_LABEL,
  DEPARTMENTS,
  levelNameSchema,
  newLevelSchema,
  SECTION_LABEL,
  type Section,
} from "@brillianda/core";
import { Badge, Button, Card, Icon, PageHeader, ResponsiveDialog, SelectField, cx, toast } from "@brillianda/ui";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormError } from "@/components/auth/FormError";
import { FormDialog } from "@/components/FormDialog";
import type { ActionResult, ArmName, ClassArm, ClassLevel, ClassStructure } from "@/data/types";

export type ClassActions = {
  renameLevel: (levelId: string, input: unknown) => Promise<ActionResult<null>>;
  addLevel: (input: unknown) => Promise<ActionResult<null>>;
  removeLevel: (levelId: string) => Promise<ActionResult<null>>;
  setLevelArchived: (levelId: string, archived: boolean) => Promise<ActionResult<null>>;
  addArm: (levelId: string, input: unknown) => Promise<ActionResult<null>>;
  renameArmName: (armNameId: string, input: unknown) => Promise<ActionResult<null>>;
  setArmDepartment: (armId: string, department: string | null) => Promise<ActionResult<null>>;
  setArmArchived: (armId: string, archived: boolean) => Promise<ActionResult<null>>;
  removeArm: (armId: string) => Promise<ActionResult<null>>;
};

const SECTIONS: Section[] = ["preschool", "primary", "junior", "senior"];
const TINT: Record<Section, number> = { preschool: 5, primary: 3, junior: 1, senior: 4 };
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

type Open =
  | { kind: "level"; level: ClassLevel }
  | { kind: "arm"; arm: ClassArm; level: ClassLevel }
  | { kind: "add-arm"; level: ClassLevel }
  | { kind: "arm-name"; armName: ArmName }
  | { kind: "add-level" }
  | null;

/** The school's classes after setup, by section, with everything the plan lets you change. */
export function ClassesView({ structure, actions }: { structure: ClassStructure; actions: ClassActions }) {
  const router = useRouter();
  const studentsBase = usePathname().replace(/\/classes$/, "/students");
  const [open, setOpen] = useState<Open>(null);
  const [busy, startTransition] = useTransition();
  const names = new Map(structure.armNames.map((a) => [a.id, a]));
  const armsOf = (levelId: string) =>
    structure.arms
      .filter((a) => a.levelId === levelId)
      .sort((a, b) => structure.armNames.findIndex((n) => n.id === a.armNameId) - structure.armNames.findIndex((n) => n.id === b.armNameId));
  const live = structure.arms.filter((a) => !a.archived);
  const students = structure.arms.reduce((n, a) => n + a.studentCount, 0);

  /** Runs an action, says what happened, and refreshes the page. */
  const run = (action: () => Promise<ActionResult<null>>, success: string, after?: () => void) =>
    startTransition(async () => {
      const result = await action();
      toast(result.ok ? success : result.error);
      if (result.ok) after?.();
      router.refresh();
    });

  return (
    <>
      <PageHeader
        title="Classes"
        actions={
          <Button onClick={() => setOpen({ kind: "add-level" })}>
            <Icon name="plus" className="h-4 w-4" />
            Add a class
          </Button>
        }
      >
        {plural(live.length, "class", "classes")} in {plural(structure.levels.length, "level")}, {plural(students, "student")}. Tap a class or an arm to change it.
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        {SECTIONS.map((section) => {
          const levels = structure.levels.filter((l) => l.section === section);
          if (!levels.length) return null;
          const inSection = levels.flatMap((l) => armsOf(l.id));
          return (
            <section key={section} aria-labelledby={`section-${section}`} className="relative isolate grid animate-pop content-start gap-4 overflow-hidden rounded-[28px] bg-surface p-5 shadow-raised sm:p-6">
              <span aria-hidden className="absolute -bottom-28 -right-16 -z-10 h-64 w-64 rounded-full opacity-70" style={{ background: `var(--level-${TINT[section]}-tint)` }} />
              <div>
                <h2 id={`section-${section}`} className="text-[24px] font-medium leading-tight tracking-[-0.03em]">
                  {SECTION_LABEL[section]}
                </h2>
                <p className="mt-1 text-sm text-text-secondary">
                  {levels[0]!.name} to {levels.at(-1)!.name}. {plural(inSection.filter((a) => !a.archived).length, "class", "classes")}, {plural(inSection.reduce((n, a) => n + a.studentCount, 0), "student")}.
                </p>
              </div>
              <ul className="grid gap-2">
                {levels.map((level) => {
                  const arms = armsOf(level.id);
                  const liveArms = arms.filter((a) => !a.archived).length;
                  return (
                    <li key={level.id} className={cx("grid gap-2 rounded-2xl bg-[color-mix(in_oklab,var(--color-surface)_80%,transparent)] p-3 shadow-[inset_0_0_0_1px_var(--color-border)]", level.archived && "opacity-60")}>
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setOpen({ kind: "level", level })}
                          className="-m-1 flex min-h-[40px] items-center gap-2 rounded-xl p-1 text-left font-semibold hover:text-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
                        >
                          {level.name}
                          {level.archived && <Badge>Archived</Badge>}
                          <span className="text-[12.5px] font-normal text-text-secondary">{plural(arms.reduce((n, a) => n + a.studentCount, 0), "student")}</span>
                        </button>
                        <Button size="sm" variant="ghost" onClick={() => setOpen({ kind: "add-arm", level })} aria-label={`Add an arm to ${level.name}`}>
                          <Icon name="plus" className="h-4 w-4" />
                          Arm
                        </Button>
                      </div>
                      <ul className="flex flex-wrap gap-1.5" aria-label={`${level.name} arms`}>
                        {arms.map((arm) => {
                          const name = names.get(arm.armNameId);
                          return (
                            <li key={arm.id}>
                              <button
                                type="button"
                                onClick={() => setOpen({ kind: "arm", arm, level })}
                                className={cx(
                                  "inline-flex min-h-[36px] items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent",
                                  arm.archived ? "bg-sunken text-text-muted line-through" : "bg-accent-soft text-accent hover:brightness-95",
                                )}
                              >
                                {/* "JSS1 GOL" on a phone, "Gold" on a laptop (plan: short codes for tight screens). */}
                                <span className="md:hidden">{armChip(level.short, name?.code ?? "", liveArms)}</span>
                                <span className="hidden md:inline">{liveArms > 1 || arm.archived ? name?.name : "One arm"}</span>
                                {arm.department && <span className="opacity-70">· {DEPARTMENT_LABEL[arm.department]}</span>}
                                {arm.studentCount > 0 && <span className="opacity-70">· {arm.studentCount}</span>}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>

      <Card className="mt-4" title="Arm names" description="Each name lives once for the whole school, so renaming one renames it in every class.">
        <ul className="flex flex-wrap gap-2">
          {structure.armNames.map((armName) => (
            <li key={armName.id}>
              <button
                type="button"
                onClick={() => setOpen({ kind: "arm-name", armName })}
                className="inline-flex min-h-[40px] items-center gap-2 rounded-full bg-raise pl-4 pr-2 text-sm font-medium shadow-raised hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
              >
                {armName.name}
                <span className="rounded-full bg-sunken px-2 py-0.5 text-[11.5px] font-semibold text-text-secondary">{armName.code}</span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {open?.kind === "level" && (
        <LevelDialog
          level={open.level}
          students={armsOf(open.level.id).reduce((n, a) => n + a.studentCount, 0)}
          busy={busy}
          onClose={() => setOpen(null)}
          rename={(input) => actions.renameLevel(open.level.id, input)}
          onRenamed={(name) => {
            toast(`Renamed to ${name}`);
            setOpen(null);
            router.refresh();
          }}
          archive={() => run(() => actions.setLevelArchived(open.level.id, !open.level.archived), open.level.archived ? `${open.level.name} is back` : `${open.level.name} archived`, () => setOpen(null))}
          remove={() => run(() => actions.removeLevel(open.level.id), `${open.level.name} removed`, () => setOpen(null))}
        />
      )}
      {open?.kind === "arm" && (
        <ArmDialog
          arm={open.arm}
          level={open.level}
          name={names.get(open.arm.armNameId)}
          onlyArm={armsOf(open.level.id).length === 1}
          importHref={`${studentsBase}/import?arm=${open.arm.id}`}
          busy={busy}
          onClose={() => setOpen(null)}
          setDepartment={(d) => run(() => actions.setArmDepartment(open.arm.id, d), d ? `Department set to ${DEPARTMENT_LABEL[d as keyof typeof DEPARTMENT_LABEL]}` : "Department cleared", () => setOpen(null))}
          archive={() => run(() => actions.setArmArchived(open.arm.id, !open.arm.archived), open.arm.archived ? "Brought back" : "Archived", () => setOpen(null))}
          remove={() => run(() => actions.removeArm(open.arm.id), "Arm removed", () => setOpen(null))}
        />
      )}
      {open?.kind === "add-arm" && (
        <AddArmDialog
          level={open.level}
          available={structure.armNames.filter((n) => !armsOf(open.level.id).some((a) => a.armNameId === n.id))}
          add={(input) => actions.addArm(open.level.id, input)}
          onClose={() => setOpen(null)}
          onAdded={() => {
            toast(`Arm added to ${open.level.name}`);
            setOpen(null);
            router.refresh();
          }}
        />
      )}
      {open?.kind === "arm-name" && (
        <FormDialog
          title={`Rename ${open.armName.name}`}
          description="This renames it in every class."
          fields={[
            { key: "name", label: "Arm name", initial: open.armName.name },
            { key: "code", label: "Short code", initial: open.armName.code, hint: "Up to 4 letters, for phone screens", upper: true },
          ]}
          schema={armNameSchema}
          submitLabel="Rename everywhere"
          submit={(input) => actions.renameArmName(open.armName.id, input)}
          onClose={() => setOpen(null)}
          onDone={() => {
            toast("Arm renamed in every class");
            setOpen(null);
            router.refresh();
          }}
        />
      )}
      {open?.kind === "add-level" && (
        <FormDialog
          title="Add a class"
          description="For a class the ladder doesn’t have, like Year 13 or a Pre-JSS class. It starts with your first arm."
          fields={[
            { key: "name", label: "Class name", initial: "", placeholder: "e.g. Pre-JSS" },
            { key: "short", label: "Short name", initial: "", hint: "Up to 8 letters, e.g. PJSS", upper: true },
            { key: "section", label: "Section", initial: structure.levels.at(-1)?.section ?? "junior", options: SECTIONS.map((s) => ({ value: s, label: SECTION_LABEL[s] })) },
          ]}
          schema={newLevelSchema}
          submitLabel="Add the class"
          submit={actions.addLevel}
          onClose={() => setOpen(null)}
          onDone={() => {
            toast("Class added");
            setOpen(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function LevelDialog({
  level,
  students,
  busy,
  onClose,
  rename,
  onRenamed,
  archive,
  remove,
}: {
  level: ClassLevel;
  students: number;
  busy: boolean;
  onClose: () => void;
  rename: (input: unknown) => Promise<ActionResult<null>>;
  onRenamed: (name: string) => void;
  archive: () => void;
  remove: () => void;
}) {
  return (
    <FormDialog
      title={level.name}
      description={`${plural(students, "student")}. Renaming keeps every student where they are.`}
      fields={[
        { key: "name", label: "Class name", initial: level.name },
        { key: "short", label: "Short name", initial: level.short, hint: "Shown on phone screens, e.g. JSS1", upper: true },
      ]}
      schema={levelNameSchema}
      submitLabel="Save"
      submit={rename}
      onClose={onClose}
      onDone={(values) => onRenamed(values.name ?? level.name)}
      extra={
        <div className="grid gap-2 border-t border-divider pt-4">
          <p className="text-sm text-text-secondary">
            {students ? "A class with students can’t be removed. Move them first, or archive the class: it keeps its history for past sessions." : "Archive a class you no longer run; it keeps its history. Remove it if it was a mistake."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={busy} onClick={archive}>
              {level.archived ? "Bring it back" : "Archive"}
            </Button>
            <Button size="sm" variant="danger-quiet" disabled={busy || students > 0} onClick={remove}>
              Remove {level.name}
            </Button>
          </div>
        </div>
      }
    />
  );
}

function ArmDialog({
  arm,
  level,
  name,
  onlyArm,
  importHref,
  busy,
  onClose,
  setDepartment,
  archive,
  remove,
}: {
  arm: ClassArm;
  level: ClassLevel;
  name?: ArmName;
  onlyArm: boolean;
  importHref: string;
  busy: boolean;
  onClose: () => void;
  setDepartment: (department: string | null) => void;
  archive: () => void;
  remove: () => void;
}) {
  const label = onlyArm ? level.name : `${level.name} ${name?.name ?? ""}`;
  return (
    <ResponsiveDialog open onClose={onClose} title={label} description={`${plural(arm.studentCount, "student")}. Code ${name?.code ?? ""}; rename arms under “Arm names”.`}>
      <div className="grid gap-5">
        <Link href={importHref} className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full bg-raise px-5 text-sm font-medium shadow-raised hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
          Import students into {label}
        </Link>
        {level.section === "senior" && (
          <SelectField label="Department" hint="Subject defaults follow the department." value={arm.department ?? ""} disabled={busy} onChange={(e) => setDepartment(e.target.value || null)}>
            <option value="">None</option>
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>
                {DEPARTMENT_LABEL[d]}
              </option>
            ))}
          </SelectField>
        )}
        <div className="grid gap-2">
          <p className="text-sm text-text-secondary">
            {arm.studentCount
              ? "An arm with students can’t be removed. Move them first, or archive it."
              : onlyArm
                ? "This is the class’s only arm, so it can’t be removed on its own."
                : "Archive an arm you no longer use; it keeps its history. Remove it if it was a mistake."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" disabled={busy} onClick={archive}>
              {arm.archived ? "Bring it back" : "Archive"}
            </Button>
            <Button size="sm" variant="danger-quiet" disabled={busy || arm.studentCount > 0 || onlyArm} onClick={remove}>
              Remove
            </Button>
          </div>
        </div>
      </div>
    </ResponsiveDialog>
  );
}

function AddArmDialog({
  level,
  available,
  add,
  onClose,
  onAdded,
}: {
  level: ClassLevel;
  available: ArmName[];
  add: (input: unknown) => Promise<ActionResult<null>>;
  onClose: () => void;
  onAdded: () => void;
}) {
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const pick = (armNameId: string) =>
    startTransition(async () => {
      const result = await add({ armNameId });
      if (result.ok) onAdded();
      else setFailure(result.error);
    });
  return (
    <FormDialog
      title={`Add an arm to ${level.name}`}
      description={available.length ? "Pick one of your arms, or make a new one." : "Make a new arm. It becomes one of your school’s arm names."}
      fields={[
        { key: "name", label: "New arm name", initial: "", placeholder: "e.g. Purple" },
        { key: "code", label: "Short code", initial: "", hint: "Up to 4 letters", upper: true },
      ]}
      schema={armNameSchema}
      submitLabel="Add the new arm"
      submit={add}
      onClose={onClose}
      onDone={onAdded}
      before={
        available.length > 0 && (
          <div className="grid gap-2">
            <p className="text-sm font-medium">Your arms</p>
            <div className="flex flex-wrap gap-2">
              {available.map((armName) => (
                <Button key={armName.id} size="sm" variant="secondary" disabled={pending} onClick={() => pick(armName.id)}>
                  {armName.name}
                </Button>
              ))}
            </div>
            <FormError message={failure} />
          </div>
        )
      }
    />
  );
}
