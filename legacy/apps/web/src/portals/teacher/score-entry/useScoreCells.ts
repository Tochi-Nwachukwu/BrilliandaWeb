import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatScore,
  parseScoreInput,
  type CellValue,
  type EntryState,
  type ScoreSheet,
} from "@brillanda/shared-types";
import { ApiError } from "../../../shared/api/client";
import { saveScore } from "../api";

export type SaveState = "idle" | "saving" | "saved" | "failed";
export type CellView = { value: CellValue | null; save: SaveState; error?: string };
/** studentId → componentId → cell */
export type GridViews = Record<string, Record<string, CellView>>;
export type CommitResult = { ok: true; text: string } | { ok: false };

export const cellKey = (studentId: string, componentId: string) => `${studentId}/${componentId}`;

function sameValue(a: CellValue | null | undefined, b: CellValue | null | undefined): boolean {
  if (!a || !b) return !a && !b;
  return a.value === b.value && a.isAbsent === b.isAbsent;
}

export function valuesOf(row: Record<string, CellView> | undefined): Record<string, CellValue | null> {
  return Object.fromEntries(Object.entries(row ?? {}).map(([componentId, cell]) => [componentId, cell.value]));
}

type CellRef = { studentId: string; componentId: string };

/**
 * The grid's cell values and autosave (FR-12.4, BRD R-5).
 * - Saves for one cell go out one at a time, always with the newest value, so a slow response
 *   can never overwrite a later edit.
 * - A save that fails for network reasons is kept and retried when the connection comes back,
 *   when any other save succeeds, or when the teacher asks.
 */
export function useScoreCells(sheet: ScoreSheet, onEntryStatus: (status: EntryState) => void) {
  const [views, setViews] = useState<GridViews>(() =>
    Object.fromEntries(
      sheet.rows.map((row) => [
        row.studentId,
        Object.fromEntries(
          sheet.components.map((component) => [
            component.id,
            { value: row.scores[component.id] ?? null, save: "idle" } satisfies CellView,
          ]),
        ),
      ]),
    ),
  );

  // Bookkeeping that must not re-render the grid.
  const [saves] = useState(() => {
    const confirmed = new Map<string, CellValue | null>();
    for (const row of sheet.rows) {
      for (const component of sheet.components) {
        confirmed.set(cellKey(row.studentId, component.id), row.scores[component.id] ?? null);
      }
    }
    return {
      /** Last value the server accepted. */
      confirmed,
      /** Last value the teacher committed, which is what should end up on the server. */
      latest: new Map(confirmed),
      inFlight: new Set<string>(),
      failed: new Map<string, CellRef>(),
    };
  });

  const maxScores = useMemo(
    () => new Map(sheet.components.map((component) => [component.id, component.maxScore])),
    [sheet.components],
  );

  const patchCell = useCallback((studentId: string, componentId: string, patch: Partial<CellView>) => {
    setViews((previous) => {
      const current = previous[studentId]?.[componentId];
      if (!current) return previous;
      const next = { ...current, ...patch };
      if (next.save === current.save && next.error === current.error && sameValue(next.value, current.value)) {
        return previous;
      }
      return { ...previous, [studentId]: { ...previous[studentId], [componentId]: next } };
    });
  }, []);

  const send = useCallback(
    async function send(studentId: string, componentId: string): Promise<void> {
      const key = cellKey(studentId, componentId);
      if (saves.inFlight.has(key)) return; // the running save sends the newest value when it finishes

      const target = saves.latest.get(key) ?? null;
      if (sameValue(target, saves.confirmed.get(key))) {
        if (saves.failed.delete(key)) patchCell(studentId, componentId, { save: "idle" });
        return;
      }

      saves.inFlight.add(key);
      patchCell(studentId, componentId, { save: "saving" });
      try {
        const response = await saveScore(studentId, componentId, {
          subjectId: sheet.subject.id,
          termId: sheet.term.id,
          value: target && !target.isAbsent ? target.value : null,
          isAbsent: target?.isAbsent ?? false,
        });
        saves.inFlight.delete(key);
        saves.confirmed.set(key, target);
        saves.failed.delete(key);
        onEntryStatus(response.status);

        if (!sameValue(saves.latest.get(key), target)) {
          void send(studentId, componentId);
          return;
        }
        patchCell(studentId, componentId, { save: "saved" });
        // The connection evidently works again.
        for (const cell of [...saves.failed.values()]) void send(cell.studentId, cell.componentId);
      } catch (error) {
        saves.inFlight.delete(key);
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          // The server refused this value (e.g. the sheet was just locked): restore the saved one.
          const confirmed = saves.confirmed.get(key) ?? null;
          saves.latest.set(key, confirmed);
          patchCell(studentId, componentId, {
            value: confirmed,
            save: "idle",
            error: error.fields.value?.[0] ?? error.message,
          });
        } else {
          saves.failed.set(key, { studentId, componentId });
          patchCell(studentId, componentId, { save: "failed" });
        }
      }
    },
    [onEntryStatus, patchCell, saves, sheet.subject.id, sheet.term.id],
  );

  const retryFailed = useCallback(() => {
    for (const cell of [...saves.failed.values()]) void send(cell.studentId, cell.componentId);
  }, [saves, send]);

  useEffect(() => {
    window.addEventListener("online", retryFailed);
    return () => window.removeEventListener("online", retryFailed);
  }, [retryFailed]);

  /** Called when the teacher leaves a cell (Enter, Tab, arrows, click away). */
  const commit = useCallback(
    (studentId: string, componentId: string, raw: string): CommitResult => {
      const maxScore = maxScores.get(componentId);
      if (maxScore === undefined) return { ok: false };

      const parsed = parseScoreInput(raw, maxScore);
      if (!parsed.ok) {
        patchCell(studentId, componentId, { error: parsed.error });
        return { ok: false };
      }
      saves.latest.set(cellKey(studentId, componentId), parsed.cell);
      patchCell(studentId, componentId, { value: parsed.cell, error: undefined });
      void send(studentId, componentId);
      return { ok: true, text: formatScore(parsed.cell) };
    },
    [maxScores, patchCell, saves, send],
  );

  const { failedCount, hasUnsavedWork } = useMemo(() => {
    let failed = 0;
    let busy = false;
    for (const row of Object.values(views)) {
      for (const cell of Object.values(row)) {
        if (cell.save === "failed") failed += 1;
        if (cell.save === "saving" || cell.error) busy = true;
      }
    }
    return { failedCount: failed, hasUnsavedWork: busy || failed > 0 };
  }, [views]);

  return { views, commit, retryFailed, failedCount, hasUnsavedWork };
}
