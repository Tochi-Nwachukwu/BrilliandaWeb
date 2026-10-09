"use client";

import { GENDER_LABEL, matchesSearch, STATUS_DETAIL, STATUS_LABEL, STUDENT_STATUSES, toCsv, type StudentStatus } from "@brillianda/core/students";
import { ActionBar } from "@brillianda/ui/ActionBar";
import { Badge, type Tone } from "@brillianda/ui/Badge";
import { Button } from "@brillianda/ui/Button";
import { cx } from "@brillianda/ui/cx";
import { DataList, type ColumnDef } from "@brillianda/ui/DataList";
import { EmptyState } from "@brillianda/ui/EmptyState";
import { FilterSheet } from "@brillianda/ui/FilterSheet";
import { Icon } from "@brillianda/ui/Icon";
import { levelStyle } from "@brillianda/ui/levels";
import { PageHeader } from "@brillianda/ui/PageHeader";
import { ResponsiveDialog } from "@brillianda/ui/ResponsiveDialog";
import { SelectField } from "@brillianda/ui/TextField";
import { toast } from "@brillianda/ui/Toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { initials } from "@/lib/initials";
import type { ActionResult, ArmOption, StudentRow, StudentsList } from "@/data/types";

export const STATUS_TONE: Record<StudentStatus, Tone> = { active: "success", suspended: "warning", withdrawn: "neutral", transferred: "info", graduated: "info" };

export type StudentListActions = {
  moveStudents: (input: unknown) => Promise<ActionResult<{ moved: number }>>;
  setStudentsStatus: (input: unknown) => Promise<ActionResult<{ changed: number }>>;
};

/** Arms grouped by class level, for pickers. */
export function ArmOptions({ arms }: { arms: ArmOption[] }) {
  const levels = [...new Map(arms.map((a) => [a.levelId, a.levelName])).entries()];
  return (
    <>
      {levels.map(([levelId, levelName]) => (
        <optgroup key={levelId} label={levelName}>
          {arms
            .filter((a) => a.levelId === levelId)
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
        </optgroup>
      ))}
    </>
  );
}

function download(filename: string, csv: string) {
  // A byte order mark so Excel reads names with Ọ and ṣ correctly.
  const url = URL.createObjectURL(new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

/** The student list (plan: "Managing students"). Filters and selection stay on this device. */
export function StudentsView({ school, list, actions }: { school: string; list: StudentsList; actions: StudentListActions }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [levelId, setLevelId] = useState("");
  const [armId, setArmId] = useState("");
  const [gender, setGender] = useState("");
  const [status, setStatus] = useState("active");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<"move" | "status" | null>(null);

  const arms = useMemo(() => new Map(list.arms.map((a) => [a.id, a])), [list.arms]);
  const levels = [...new Map(list.arms.map((a) => [a.levelId, a.levelName])).entries()];
  const shown = useMemo(
    () =>
      list.students.filter(
        (s) =>
          (!query || matchesSearch(s, query)) &&
          (!levelId || arms.get(s.armId)?.levelId === levelId) &&
          (!armId || s.armId === armId) &&
          (!gender || s.gender === gender) &&
          (!status || s.status === status),
      ),
    [list.students, query, levelId, armId, gender, status, arms],
  );
  const active = [levelId, armId, gender, status !== "active" ? status : ""].filter(Boolean).length;

  const columns = useMemo<ColumnDef<StudentRow, unknown>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: "Name",
        enableHiding: false,
        cell: ({ row }) => (
          <Link href={`/s/${school}/students/${row.original.id}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:text-accent hover:underline">
            {row.original.fullName}
          </Link>
        ),
      },
      { accessorKey: "admissionNo", header: "Admission no." },
      { id: "class", header: "Class", accessorFn: (s) => arms.get(s.armId)?.label ?? "", sortingFn: (a, b) => (arms.get(a.original.armId)?.levelPosition ?? 0) - (arms.get(b.original.armId)?.levelPosition ?? 0) || (arms.get(a.original.armId)?.label ?? "").localeCompare(arms.get(b.original.armId)?.label ?? "") },
      { accessorKey: "gender", header: "Gender", cell: ({ row }) => GENDER_LABEL[row.original.gender] },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <Badge tone={STATUS_TONE[row.original.status]}>{STATUS_LABEL[row.original.status]}</Badge> },
      { accessorKey: "guardianName", header: "Guardian", cell: ({ row }) => row.original.guardianName ?? <span className="text-text-muted">None yet</span> },
    ],
    [arms, school],
  );

  const exportCsv = (rows: StudentRow[]) => {
    const csv = toCsv(
      ["Admission number", "Full name", "Class", "Gender", "Date of birth", "Status", "Guardian", "Guardian phone"],
      rows.map((s) => [s.admissionNo, s.fullName, arms.get(s.armId)?.label ?? "", GENDER_LABEL[s.gender], s.dateOfBirth, STATUS_LABEL[s.status], s.guardianName, s.guardianPhone]),
    );
    download(`students-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    toast(`Exported ${rows.length} ${rows.length === 1 ? "student" : "students"}`);
  };

  if (!list.arms.length) {
    return (
      <>
        <PageHeader title="Students" />
        <EmptyState title="Set up your classes first">
          Every student sits in a class.{" "}
          <Link href={`/s/${school}/classes`} className="font-medium text-accent hover:underline">
            Go to Classes
          </Link>
        </EmptyState>
      </>
    );
  }

  const selectedRows = list.students.filter((s) => selected.has(s.id));

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Students"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/s/${school}/students/import`}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-full bg-raise px-5 text-sm font-medium shadow-raised hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Icon name="upload" className="h-4 w-4" />
              Import
            </Link>
            <Link
              href={`/s/${school}/students/new`}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-text hover:bg-primary-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              <Icon name="plus" className="h-4 w-4" />
              Add a student
            </Link>
          </div>
        }
      >
        {list.students.filter((s) => s.status === "active").length} active students. Next admission number: {list.nextAdmissionNo}.
      </PageHeader>

      <div className="flex flex-wrap items-start gap-3">
        <label className="relative w-full md:max-w-sm">
          <span className="sr-only">Search students</span>
          <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-text-muted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or admission number"
            className="min-h-[46px] w-full rounded-full border-0 bg-raise pl-11 pr-4 text-base shadow-raised focus:outline-hidden focus:ring-2 focus:ring-accent"
          />
        </label>
        <FilterSheet
          activeCount={active}
          resultLabel={`Show ${shown.length} students`}
          onClear={() => {
            setLevelId("");
            setArmId("");
            setGender("");
            setStatus("active");
          }}
        >
          <SelectField
            label="Class"
            value={levelId}
            onChange={(e) => {
              setLevelId(e.target.value);
              setArmId("");
            }}
            className="md:w-40"
          >
            <option value="">Every class</option>
            {levels.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </SelectField>
          <SelectField label="Arm" value={armId} onChange={(e) => setArmId(e.target.value)} className="md:w-44">
            <option value="">Every arm</option>
            {list.arms
              .filter((a) => !levelId || a.levelId === levelId)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
          </SelectField>
          <SelectField label="Gender" value={gender} onChange={(e) => setGender(e.target.value)} className="md:w-32">
            <option value="">Any</option>
            <option value="FEMALE">Female</option>
            <option value="MALE">Male</option>
          </SelectField>
          <SelectField label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className="md:w-36">
            <option value="">Any</option>
            {STUDENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </SelectField>
        </FilterSheet>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => exportCsv(shown)} disabled={!shown.length}>
          Export {shown.length}
        </Button>
      </div>

      <ActionBar count={selected.size} noun={["student", "students"]} onClear={() => setSelected(new Set())}>
        <Button size="sm" onClick={() => setDialog("move")}>
          Move
        </Button>
        <Button size="sm" onClick={() => setDialog("status")}>
          Status
        </Button>
        <Button size="sm" onClick={() => exportCsv(selectedRows)}>
          Export
        </Button>
      </ActionBar>

      <DataList
        label="Students"
        rows={shown}
        columns={columns}
        getRowId={(s) => s.id}
        selected={selected}
        onSelectedChange={setSelected}
        onOpen={(s) => router.push(`/s/${school}/students/${s.id}`)}
        pageSize={50}
        empty={<EmptyState title={query || active ? "No students match" : "No students yet"}>{query || active ? "Try another search or clear the filters." : "Add your first student, or import your whole list."}</EmptyState>}
        renderCard={(s) => {
          const arm = arms.get(s.armId);
          return (
            <span className="flex items-center gap-3" style={levelStyle(arm?.levelPosition ?? 0)}>
              <span aria-hidden className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-semibold" style={{ background: "var(--tint)", color: "var(--deep)" }}>
                {initials(s.fullName)}
              </span>
              <span className="min-w-0 flex-1">
                <b className="block truncate font-medium">{s.fullName}</b>
                <span className="block truncate text-[12.5px] text-text-secondary">
                  {arm?.chip} · {s.admissionNo}
                </span>
              </span>
              {s.status !== "active" && <Badge tone={STATUS_TONE[s.status]}>{STATUS_LABEL[s.status]}</Badge>}
            </span>
          );
        }}
      />

      {dialog === "move" && (
        <MoveDialog
          count={selected.size}
          arms={list.arms}
          onClose={() => setDialog(null)}
          move={(target) => actions.moveStudents({ studentIds: [...selected], armId: target })}
          onDone={(moved, label) => {
            toast(`Moved ${moved} ${moved === 1 ? "student" : "students"} to ${label}`);
            setSelected(new Set());
            setDialog(null);
            router.refresh();
          }}
        />
      )}
      {dialog === "status" && (
        <StatusDialog
          count={selected.size}
          onClose={() => setDialog(null)}
          change={(next) => actions.setStudentsStatus({ studentIds: [...selected], status: next })}
          onDone={(changed, next) => {
            toast(`${changed} ${changed === 1 ? "student" : "students"} marked ${STATUS_LABEL[next].toLowerCase()}`);
            setSelected(new Set());
            setDialog(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function MoveDialog({
  count,
  arms,
  onClose,
  move,
  onDone,
}: {
  count: number;
  arms: ArmOption[];
  onClose: () => void;
  move: (armId: string) => Promise<ActionResult<{ moved: number }>>;
  onDone: (moved: number, label: string) => void;
}) {
  const [target, setTarget] = useState("");
  const [pending, startTransition] = useTransition();
  const label = arms.find((a) => a.id === target)?.label ?? "";
  return (
    <ResponsiveDialog
      open
      onClose={onClose}
      title={`Move ${count} ${count === 1 ? "student" : "students"}`}
      description="Each one’s class history keeps the class they were in."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={pending}
            disabled={!target}
            onClick={() =>
              startTransition(async () => {
                const result = await move(target);
                if (result.ok) onDone(result.data.moved, label);
                else toast(result.error);
              })
            }
          >
            Move{label ? ` to ${label}` : ""}
          </Button>
        </>
      }
    >
      <SelectField label="Move to" value={target} onChange={(e) => setTarget(e.target.value)}>
        <option value="">Choose a class</option>
        <ArmOptions arms={arms} />
      </SelectField>
    </ResponsiveDialog>
  );
}

export function StatusDialog({
  count,
  onClose,
  change,
  onDone,
}: {
  count: number;
  onClose: () => void;
  change: (status: StudentStatus) => Promise<ActionResult<{ changed: number }>>;
  onDone: (changed: number, status: StudentStatus) => void;
}) {
  const [next, setNext] = useState<StudentStatus | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <ResponsiveDialog
      open
      onClose={onClose}
      title={`Change the status of ${count} ${count === 1 ? "student" : "students"}`}
      description="Their records stay whatever you choose. Delete is only for mistakes, on a student’s page."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={pending}
            disabled={!next}
            onClick={() =>
              next &&
              startTransition(async () => {
                const result = await change(next);
                if (result.ok) onDone(result.data.changed, next);
                else toast(result.error);
              })
            }
          >
            Save
          </Button>
        </>
      }
    >
      <fieldset className="grid gap-2">
        <legend className="sr-only">Status</legend>
        {STUDENT_STATUSES.map((s) => (
          <label key={s} className={cx("flex cursor-pointer items-start gap-3 rounded-2xl p-3 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent", next === s ? "bg-accent-soft" : "bg-sunken hover:bg-hover")}>
            <input type="radio" name="status" className="mt-1 h-[18px] w-[18px] accent-[var(--color-accent)]" checked={next === s} onChange={() => setNext(s)} />
            <span>
              <b className="block font-semibold">{STATUS_LABEL[s]}</b>
              <span className="text-[13px] text-text-secondary">{STATUS_DETAIL[s]}</span>
            </span>
          </label>
        ))}
      </fieldset>
    </ResponsiveDialog>
  );
}
