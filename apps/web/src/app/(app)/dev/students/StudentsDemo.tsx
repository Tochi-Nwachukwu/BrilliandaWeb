"use client";

import { ActionBar, Badge, Button, DataList, FilterSheet, PageHeader, SelectField, levelOfArm, levelStyle, toast, type ColumnDef } from "@brillianda/ui";
import { useMemo, useState } from "react";
import { initials } from "@/components/shell/AppShell";

type Row = { id: string; fullName: string; admissionNo: string; arm: string; gender: "Male" | "Female"; parent: boolean };

// Made-up students, the same on every load (no randomness, so server and browser agree).
const FIRST = ["Adaeze", "Chinedu", "Fatima", "Tunde", "Ngozi", "Ibrahim", "Kemi", "Emeka", "Zainab", "Seun", "Chiamaka", "Musa"];
const LAST = ["Okafor", "Bello", "Adeyemi", "Eze", "Abubakar", "Ogunleye", "Nwosu", "Danjuma", "Afolabi", "Umeh"];
const ARMS = ["JSS 1A", "JSS 1B", "JSS 2A", "JSS 3A", "SS 1A", "SS 2A", "SS 3A"];
const ROWS: Row[] = Array.from({ length: 64 }, (_, i) => ({
  id: `s${i + 1}`,
  fullName: `${FIRST[(i * 7) % FIRST.length]} ${LAST[(i * 3) % LAST.length]}`,
  admissionNo: `GFC/2026/${String(i + 1).padStart(3, "0")}`,
  arm: ARMS[i % ARMS.length]!,
  gender: i % 2 ? "Female" : "Male",
  parent: i % 5 !== 0,
}));

const COLUMNS: ColumnDef<Row, unknown>[] = [
  { accessorKey: "fullName", header: "Name", enableHiding: false, cell: ({ row }) => <span className="font-medium">{row.original.fullName}</span> },
  { accessorKey: "admissionNo", header: "Admission no." },
  { accessorKey: "arm", header: "Arm" },
  { accessorKey: "gender", header: "Gender" },
  {
    accessorKey: "parent",
    header: "Parent",
    cell: ({ row }) => (row.original.parent ? <Badge tone="success">Linked</Badge> : <Badge tone="warning">None yet</Badge>),
  },
];

/** The list patterns together: filters, a card/table list, and the selection bar. */
export function StudentsDemo() {
  const [arm, setArm] = useState("");
  const [gender, setGender] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rows = useMemo(() => ROWS.filter((r) => (!arm || r.arm === arm) && (!gender || r.gender === gender)), [arm, gender]);
  const active = Number(!!arm) + Number(!!gender);

  return (
    <div className="grid gap-5">
      <PageHeader title="Students" actions={<Button>Add a student</Button>}>
        {rows.length} of {ROWS.length} students
      </PageHeader>

      <FilterSheet
        activeCount={active}
        resultLabel={`Show ${rows.length} students`}
        onClear={() => {
          setArm("");
          setGender("");
        }}
      >
        <SelectField label="Arm" value={arm} onChange={(e) => setArm(e.target.value)} className="md:w-48">
          <option value="">All arms</option>
          {ARMS.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </SelectField>
        <SelectField label="Gender" value={gender} onChange={(e) => setGender(e.target.value)} className="md:w-40">
          <option value="">Any</option>
          <option>Male</option>
          <option>Female</option>
        </SelectField>
      </FilterSheet>

      <ActionBar count={selected.size} noun={["student", "students"]} onClear={() => setSelected(new Set())}>
        <Button size="sm" onClick={() => toast(`Moved ${selected.size} to another arm`, { undo: () => undefined })}>
          Move
        </Button>
        <Button size="sm" onClick={() => toast("Export started")}>
          Export
        </Button>
      </ActionBar>

      <DataList
        label="Students"
        rows={rows}
        columns={COLUMNS}
        getRowId={(r) => r.id}
        selected={selected}
        onSelectedChange={setSelected}
        onOpen={(r) => toast(`Open ${r.fullName}`)}
        pageSize={20}
        renderCard={(r) => (
          <span className="flex items-center gap-3" style={levelStyle(levelOfArm(r.arm))}>
            <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold" style={{ background: "var(--tint)", color: "var(--deep)" }}>
              {initials(r.fullName)}
            </span>
            <span className="min-w-0 flex-1">
              <b className="block truncate font-medium">{r.fullName}</b>
              <span className="text-[12.5px] text-text-secondary">
                {r.arm} · {r.admissionNo}
              </span>
            </span>
            {!r.parent && <Badge tone="warning">No parent</Badge>}
          </span>
        )}
      />
    </div>
  );
}
