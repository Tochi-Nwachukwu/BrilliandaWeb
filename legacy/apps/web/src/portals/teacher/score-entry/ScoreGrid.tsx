import { memo, useCallback, useRef, type FocusEvent, type KeyboardEvent } from "react";
import {
  formatScore,
  resolveGrade,
  type GradeBand,
  type ScoreSheet,
  type ScoreSheetComponent,
  type ScoreSheetRow,
} from "@brillanda/shared-types";
import { Badge, gradeTone } from "../../../shared/components/Badge";
import { Check } from "../../../shared/components/icons";
import { cx } from "../../../shared/utils/cx";
import { cellKey, type CellView, type CommitResult, type GridViews, type SaveState } from "./useScoreCells";

export type RowTotal = { total: number; complete: boolean; anyEntered: boolean };

type ScoreGridProps = {
  sheet: ScoreSheet;
  views: GridViews;
  totals: RowTotal[];
  readOnly: boolean;
  onCommit: (studentId: string, componentId: string, raw: string) => CommitResult;
};

// No vertical rules and only a faint hairline between rows: alignment and the tint on the row
// being typed in do the separating (DECISIONS.md F-35).
const HEAD =
  "sticky top-0 whitespace-nowrap bg-surface px-3 pb-3 pt-4 align-bottom text-xs font-medium text-text-secondary shadow-[inset_0_-1px_0_var(--color-divider)]";
const CELL =
  "bg-surface py-1.5 shadow-[inset_0_-1px_0_var(--color-divider)] transition-colors group-hover:bg-hover group-focus-within:bg-hover";

/**
 * The score-entry grid (Build Guide §7). Inputs are uncontrolled so typing doesn't re-render the
 * grid; values are committed when the teacher leaves a cell.
 */
export function ScoreGrid({ sheet, views, totals, readOnly, onCommit }: ScoreGridProps) {
  const inputs = useRef(new Map<string, HTMLInputElement>());
  const { rows, components, gradingScale } = sheet;

  const registerInput = useCallback((key: string, element: HTMLInputElement | null) => {
    if (element) inputs.current.set(key, element);
    else inputs.current.delete(key);
  }, []);

  const commitInput = useCallback(
    (input: HTMLInputElement, studentId: string, componentId: string) => {
      if (readOnly) return true;
      const result = onCommit(studentId, componentId, input.value);
      if (result.ok) input.value = result.text;
      return result.ok;
    },
    [onCommit, readOnly],
  );

  // Enter / Shift+Enter and the up/down arrows move within a column; Tab moves across (FR-12.2).
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>, rowIndex: number, componentId: string) => {
      const step =
        event.key === "Enter" ? (event.shiftKey ? -1 : 1) : event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
      if (step === 0) return;
      event.preventDefault();

      const row = rows[rowIndex];
      if (!row || !commitInput(event.currentTarget, row.studentId, componentId)) return; // stay on an invalid score
      const next = rows[rowIndex + step];
      if (next) inputs.current.get(cellKey(next.studentId, componentId))?.focus();
    },
    [rows, commitInput],
  );

  const handleBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>, studentId: string, componentId: string) => {
      commitInput(event.currentTarget, studentId, componentId);
    },
    [commitInput],
  );

  return (
    // Sized to its columns, not the page, so a student's scores sit close together.
    <div className="max-h-[75vh] w-fit max-w-full overflow-auto rounded-3xl bg-surface shadow-raised">
      <table className="border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th scope="col" className={cx(HEAD, "left-0 z-30 min-w-[8.5rem] pl-4 text-left sm:min-w-[14rem] sm:pl-5")}>
              Student
            </th>
            {components.map((component) => (
              <th key={component.id} scope="col" className={cx(HEAD, "z-20 text-right")}>
                <span className="block text-text-primary">{component.name}</span>
                <span className="block font-normal text-text-muted">out of {component.maxScore}</span>
              </th>
            ))}
            <th scope="col" className={cx(HEAD, "z-20 text-right")}>
              <span className="block text-text-primary">Total</span>
              <span className="block font-normal text-text-muted">out of 100</span>
            </th>
            <th scope="col" className={cx(HEAD, "z-20 pr-5 text-left")}>
              Grade
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <ScoreRow
              key={row.studentId}
              row={row}
              rowIndex={rowIndex}
              last={rowIndex === rows.length - 1}
              components={components}
              cells={views[row.studentId]!}
              total={totals[rowIndex]!.total}
              complete={totals[rowIndex]!.complete}
              anyEntered={totals[rowIndex]!.anyEntered}
              gradingScale={gradingScale}
              readOnly={readOnly}
              registerInput={registerInput}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

type ScoreRowProps = {
  row: ScoreSheetRow;
  rowIndex: number;
  /** The last row shows a score error above the cell, inside the scroll area. */
  last: boolean;
  components: ScoreSheetComponent[];
  cells: Record<string, CellView>;
  total: number;
  complete: boolean;
  anyEntered: boolean;
  gradingScale: GradeBand[];
  readOnly: boolean;
  registerInput: (key: string, element: HTMLInputElement | null) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>, rowIndex: number, componentId: string) => void;
  onBlur: (event: FocusEvent<HTMLInputElement>, studentId: string, componentId: string) => void;
};

function gradeFor(total: number, scale: GradeBand[]): GradeBand | null {
  try {
    return resolveGrade(total, scale);
  } catch {
    return null;
  }
}

// Memoised: saving one cell re-renders only its own row.
const ScoreRow = memo(function ScoreRow({
  row,
  rowIndex,
  last,
  components,
  cells,
  total,
  complete,
  anyEntered,
  gradingScale,
  readOnly,
  registerInput,
  onKeyDown,
  onBlur,
}: ScoreRowProps) {
  const grade = complete ? gradeFor(total, gradingScale) : null;

  return (
    <tr className="group">
      <th scope="row" className={cx(CELL, "sticky left-0 z-10 pl-4 pr-3 text-left font-medium sm:pl-5 sm:pr-4")}>
        <span className="block max-w-[8rem] truncate sm:max-w-[16rem]" title={`${row.fullName} (${row.admissionNo})`}>
          {row.fullName}
        </span>
      </th>

      {components.map((component) => (
        <td key={component.id} className={cx(CELL, "px-2 text-right")}>
          <ScoreInput
            row={row}
            component={component}
            cell={cells[component.id]!}
            rowIndex={rowIndex}
            last={last}
            readOnly={readOnly}
            registerInput={registerInput}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
          />
        </td>
      ))}

      <td className={cx(CELL, "px-3 text-right tabular-nums")}>
        {anyEntered ? (
          <span key={total} className={cx("inline-block animate-settle", complete ? "font-semibold" : "text-text-muted")}>
            {total}
          </span>
        ) : (
          <span className="text-text-muted">–</span>
        )}
      </td>
      <td className={cx(CELL, "pl-3 pr-5")}>
        {grade ? (
          <Badge tone={gradeTone(grade, gradingScale)} title={grade.remark}>
            {grade.grade}
          </Badge>
        ) : (
          <span className="text-text-muted">–</span>
        )}
      </td>
    </tr>
  );
});

type ScoreInputProps = Pick<ScoreRowProps, "row" | "rowIndex" | "last" | "readOnly" | "registerInput" | "onKeyDown" | "onBlur"> & {
  component: ScoreSheetComponent;
  cell: CellView;
};

function ScoreInput({ row, component, cell, rowIndex, last, readOnly, registerInput, onKeyDown, onBlur }: ScoreInputProps) {
  const errorId = `score-error-${row.studentId}-${component.id}`;

  return (
    <span className="relative inline-block">
      <input
        ref={(element) => registerInput(cellKey(row.studentId, component.id), element)}
        defaultValue={formatScore(cell.value)}
        readOnly={readOnly}
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        aria-label={`${component.name} for ${row.fullName}`}
        aria-invalid={cell.error ? true : undefined}
        aria-describedby={cell.error ? errorId : undefined}
        onFocus={(event) => event.currentTarget.select()}
        onKeyDown={(event) => onKeyDown(event, rowIndex, component.id)}
        onBlur={(event) => onBlur(event, row.studentId, component.id)}
        className={cx(
          "h-10 w-[4.5rem] rounded-[11px] border-0 px-2.5 text-right text-[15px] font-medium tabular-nums transition-[background-color,box-shadow] focus:outline-none",
          cell.error
            ? "bg-danger-bg ring-2 ring-danger"
            : readOnly
              ? "bg-transparent text-text-secondary"
              : "bg-field hover:bg-hover focus:bg-surface focus:ring-2 focus:ring-accent",
        )}
      />
      <SaveMark state={cell.save} />
      {cell.error && (
        <span
          id={errorId}
          role="alert"
          className={cx("absolute right-0 z-40 whitespace-nowrap", last ? "bottom-full mb-1" : "top-full mt-1", "rounded-md bg-danger px-2 py-1 text-xs font-medium text-primary-text shadow-raised")}
        >
          {cell.error}
        </span>
      )}
    </span>
  );
}

/** Sits inside the left edge of its input; the number is right-aligned, so they never overlap. */
function SaveMark({ state }: { state: SaveState }) {
  const position = "pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2";
  if (state === "saving") {
    return <span aria-hidden className={cx(position, "h-1.5 w-1.5 animate-pulse rounded-full bg-text-muted")} />;
  }
  if (state === "saved") {
    return <Check className={cx(position, "h-3 w-3 animate-fade-out text-success")} />;
  }
  if (state === "failed") {
    return <span aria-hidden title="Not saved yet" className={cx(position, "h-1.5 w-1.5 rounded-full bg-danger")} />;
  }
  return null;
}
