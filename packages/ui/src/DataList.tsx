"use client";

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { Suspense, useMemo, useState, type ComponentProps, type ReactNode } from "react";
import { cx } from "./cx";

export type { ColumnDef } from "@tanstack/react-table";

/**
 * One list, two layouts (plan: "Card list with Select mode" on phone, "Table with sort, column
 * picker and multi-select" on laptop). Both are rendered and CSS shows the right one, so the
 * server and the browser always agree. Long lists grow with "Show more", a page at a time, on both.
 *
 * In development TanStack Table times itself with Date.now(), which Next only allows inside a
 * Suspense boundary; production builds skip that and still prerender the list.
 */
export function DataList<T>(props: ComponentProps<typeof DataListInner<T>>) {
  return (
    <Suspense>
      <DataListInner {...props} />
    </Suspense>
  );
}

function DataListInner<T>({
  label,
  rows,
  columns,
  getRowId,
  renderCard,
  selected,
  onSelectedChange,
  onOpen,
  empty,
  pageSize = 30,
}: {
  /** Names the table for screen readers, e.g. "Students". */
  label: string;
  rows: T[];
  columns: ColumnDef<T, unknown>[];
  getRowId: (row: T) => string;
  /** The phone card's content: name, one detail line, a badge. */
  renderCard: (row: T) => ReactNode;
  /** Pass both to turn selection on. */
  selected?: Set<string>;
  onSelectedChange?: (next: Set<string>) => void;
  /** Opening a row (tap a card, click a table row). */
  onOpen?: (row: T) => void;
  empty?: ReactNode;
  pageSize?: number;
}) {
  const selectable = !!selected && !!onSelectedChange;
  const [sorting, setSorting] = useState<SortingState>([]);
  const [visibility, setVisibility] = useState<VisibilityState>({});
  const [shown, setShown] = useState(pageSize);
  const [selecting, setSelecting] = useState(false);

  const rowSelection = useMemo<RowSelectionState>(() => Object.fromEntries([...(selected ?? [])].map((id) => [id, true])), [selected]);

  const allColumns = useMemo<ColumnDef<T, unknown>[]>(
    () => (selectable ? [selectColumn<T>(), ...columns] : columns),
    [columns, selectable],
  );

  const table = useReactTable({
    data: rows,
    columns: allColumns,
    getRowId: (row) => getRowId(row),
    state: { sorting, columnVisibility: visibility, rowSelection },
    enableRowSelection: selectable,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setVisibility,
    onRowSelectionChange: (updater) => {
      const next = typeof updater === "function" ? updater(rowSelection) : updater;
      onSelectedChange?.(new Set(Object.keys(next).filter((id) => next[id])));
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (!rows.length) return <>{empty}</>;

  const sortedRows = table.getRowModel().rows;
  const toggle = (id: string) => {
    if (!selected || !onSelectedChange) return;
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectedChange(next);
  };

  return (
    <div>
      {/* Phone: cards. */}
      <div className="md:hidden">
        {selectable && (
          <div className="mb-2 flex justify-end">
            <button
              type="button"
              onClick={() => {
                if (selecting) onSelectedChange(new Set());
                setSelecting(!selecting);
              }}
              className="min-h-[36px] rounded-full px-3 text-[13.5px] font-medium text-accent hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
            >
              {selecting ? "Done" : "Select"}
            </button>
          </div>
        )}
        <ul className="grid gap-2" aria-label={label}>
          {sortedRows.slice(0, shown).map((row) => {
            const on = selected?.has(row.id) ?? false;
            const choose = selecting && selectable;
            return (
              <li key={row.id}>
                <button
                  type="button"
                  aria-pressed={choose ? on : undefined}
                  onClick={() => (choose ? toggle(row.id) : onOpen?.(row.original))}
                  className={cx(
                    "flex w-full items-center gap-3 rounded-[20px] bg-surface p-3 text-left shadow-raised hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent",
                    choose && on && "ring-2 ring-accent",
                  )}
                >
                  {choose && <Check on={on} />}
                  <span className="min-w-0 flex-1">{renderCard(row.original)}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {sortedRows.length > shown && (
          <button
            type="button"
            onClick={() => setShown((n) => n + pageSize)}
            className="mt-3 min-h-[44px] w-full rounded-full bg-raise text-sm font-medium shadow-raised hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
          >
            Show more ({sortedRows.length - shown} left)
          </button>
        )}
      </div>

      {/* Laptop: a table. */}
      <div className="hidden md:block">
        <div className="mb-2 flex justify-end">
          <ColumnPicker table={table} />
        </div>
        <div className="overflow-x-auto rounded-[22px] bg-surface shadow-raised">
          <table className="w-full border-collapse text-sm" aria-label={label}>
            <thead>
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id} className="border-b border-divider">
                  {group.headers.map((header) => {
                    const sort = header.column.getIsSorted();
                    const canSort = header.column.getCanSort();
                    return (
                      <th
                        key={header.id}
                        scope="col"
                        aria-sort={sort === "asc" ? "ascending" : sort === "desc" ? "descending" : undefined}
                        className="px-4 py-3 text-left text-[12.5px] font-medium text-text-secondary"
                      >
                        {header.isPlaceholder ? null : canSort ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className="-mx-1.5 inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 hover:bg-hover hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            <SortMark dir={sort} />
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {sortedRows.slice(0, shown).map((row) => (
                <tr
                  key={row.id}
                  onClick={onOpen ? () => onOpen(row.original) : undefined}
                  className={cx("border-b border-divider last:border-0", onOpen && "cursor-pointer hover:bg-hover", row.getIsSelected() && "bg-accent-soft/60")}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3 align-middle">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {sortedRows.length > shown && (
          <button
            type="button"
            onClick={() => setShown((n) => n + pageSize)}
            className="mt-3 min-h-[44px] w-full rounded-full bg-raise text-sm font-medium shadow-raised hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
          >
            Show more ({sortedRows.length - shown} left)
          </button>
        )}
      </div>
    </div>
  );
}

function selectColumn<T>(): ColumnDef<T, unknown> {
  return {
    id: "select",
    enableSorting: false,
    enableHiding: false,
    header: ({ table }) => (
      <Checkbox
        label="Select all"
        checked={table.getIsAllRowsSelected()}
        mixed={table.getIsSomeRowsSelected()}
        onChange={() => table.toggleAllRowsSelected()}
      />
    ),
    cell: ({ row }) => <Checkbox label="Select" checked={row.getIsSelected()} onChange={() => row.toggleSelected()} />,
  };
}

function Checkbox({ label, checked, mixed, onChange }: { label: string; checked: boolean; mixed?: boolean; onChange: () => void }) {
  return (
    <input
      ref={(el) => {
        if (el) el.indeterminate = !!mixed && !checked;
      }}
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={onChange}
      onClick={(e) => e.stopPropagation()}
      className="h-[18px] w-[18px] align-middle accent-[var(--color-accent)]"
    />
  );
}

function Check({ on }: { on: boolean }) {
  return (
    <span aria-hidden className={cx("grid h-6 w-6 shrink-0 place-items-center rounded-full transition-colors", on ? "bg-accent text-primary-text" : "bg-sunken")}>
      {on && (
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      )}
    </span>
  );
}

function SortMark({ dir }: { dir: false | "asc" | "desc" }) {
  return (
    <svg viewBox="0 0 24 24" className={cx("h-3.5 w-3.5", !dir && "opacity-30")} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {dir === "desc" ? <path d="M6 9l6 6 6-6" /> : dir === "asc" ? <path d="M6 15l6-6 6 6" /> : <path d="M8 10l4-4 4 4M8 14l4 4 4-4" />}
    </svg>
  );
}

function ColumnPicker<T>({ table }: { table: ReturnType<typeof useReactTable<T>> }) {
  const [open, setOpen] = useState(false);
  const hideable = table.getAllLeafColumns().filter((c) => c.getCanHide());
  if (!hideable.length) return null;
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium text-text-secondary hover:bg-hover hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
      >
        Columns
      </button>
      {open && (
        <>
          <div aria-hidden className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-40 mt-1.5 grid w-56 animate-pop gap-0.5 rounded-[20px] bg-surface p-2 shadow-float">
            {hideable.map((column) => (
              <label key={column.id} className="flex min-h-[38px] cursor-pointer items-center gap-2.5 rounded-xl px-2.5 text-sm hover:bg-hover">
                <input
                  type="checkbox"
                  className="h-[18px] w-[18px] accent-[var(--color-accent)]"
                  checked={column.getIsVisible()}
                  onChange={column.getToggleVisibilityHandler()}
                />
                {typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
