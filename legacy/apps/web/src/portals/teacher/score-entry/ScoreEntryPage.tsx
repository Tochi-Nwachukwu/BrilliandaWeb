import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { computeSubjectTotal, type EntryState, type ScoreSheet } from "@brillanda/shared-types";
import { Alert } from "../../../shared/components/Alert";
import { EntryStatusBadge } from "../../../shared/components/Badge";
import { Button } from "../../../shared/components/Button";
import { Kbd } from "../../../shared/components/EmptyState";
import { ChevronLeft } from "../../../shared/components/icons";
import { PageSpinner } from "../../../shared/components/Spinner";
import { levelOfArm, levelStyle } from "../../../shared/theme/levels";
import { markSheetComplete, teacherKeys, useScoreSheet } from "../api";
import { RegisterStrip } from "../RegisterStrip";
import { GradeDistribution } from "./GradeDistribution";
import { ScoreGrid, type RowTotal } from "./ScoreGrid";
import { useScoreCells, valuesOf } from "./useScoreCells";

export function ScoreEntryPage() {
  const { armId = "", subjectId = "", termId = "" } = useParams();
  const sheet = useScoreSheet(armId, subjectId, termId);

  if (sheet.isPending) return <PageSpinner />;
  if (sheet.isError) {
    return (
      <div className="space-y-6">
        <BackLink hasUnsavedWork={false} />
        <Alert tone="danger">{sheet.error.message}</Alert>
      </div>
    );
  }
  // Keyed so switching to another class starts a fresh grid.
  return <ScoreEntry key={`${armId}/${subjectId}/${termId}`} sheet={sheet.data} />;
}

function ScoreEntry({ sheet }: { sheet: ScoreSheet }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<EntryState>(sheet.status);
  const cells = useScoreCells(sheet, setStatus);
  const locked = status === "LOCKED";

  const totals = useMemo<RowTotal[]>(
    () =>
      sheet.rows.map((row) => {
        const values = valuesOf(cells.views[row.studentId]);
        return {
          ...computeSubjectTotal(sheet.components, values),
          anyEntered: Object.values(values).some(Boolean),
        };
      }),
    [sheet, cells.views],
  );
  const completeTotals = totals.filter((row) => row.complete).map((row) => row.total);
  const everyoneEntered = sheet.rows.length > 0 && completeTotals.length === sheet.rows.length;

  const markComplete = useMutation({
    mutationFn: () => markSheetComplete(sheet.arm.id, sheet.subject.id, sheet.term.id),
    onSuccess: (response) => {
      setStatus(response.status);
      void queryClient.invalidateQueries({ queryKey: teacherKeys.assignments });
    },
  });

  useWarnBeforeLeaving(cells.hasUnsavedWork);

  return (
    <div className="space-y-8">
      <BackLink hasUnsavedWork={cells.hasUnsavedWork} />

      <header className="flex items-center gap-4">
        <span
          aria-hidden
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-lg font-semibold"
          style={{ ...levelStyle(levelOfArm(sheet.arm.name)), background: "var(--tint)", color: "var(--deep)" }}
        >
          {sheet.arm.name.replace(/^\s*(JSS|SS)\s*/i, "")}
        </span>
        <div className="min-w-0 space-y-1.5">
          <h1 className="text-[30px] font-medium leading-tight tracking-[-0.03em] sm:text-[36px]">{sheet.subject.name}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-text-secondary">
            <span>
              {sheet.arm.name}, {sheet.term.name} {sheet.term.sessionName}
            </span>
            <EntryStatusBadge status={status} />
          </div>
        </div>
      </header>

      {/* Grid first: entering scores is the job. The summary panel sits beside it on wide
          screens and after it on phones, where "Mark as complete" is the natural last step. */}
      <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
        <div className="min-w-0 space-y-4">
          <p className="max-w-2xl text-sm leading-relaxed text-text-secondary">
            {locked ? (
              "Your school admin has locked these scores, so they can't be changed. Ask your admin if something needs correcting."
            ) : status === "COMPLETE" ? (
              "Marked as complete. You can still correct scores until your school admin locks them."
            ) : (
              <>
                Type a score, then press <Kbd>Enter</Kbd> to go down or <Kbd>Tab</Kbd> to go across. Scores save as you
                go. Type <Kbd>ABS</Kbd> if a student was absent.
              </>
            )}
          </p>
          {cells.failedCount > 0 && (
            <Alert
              tone="warning"
              action={
                <Button variant="secondary" onClick={cells.retryFailed}>
                  Try again
                </Button>
              }
            >
              {cells.failedCount === 1 ? "1 score hasn't" : `${cells.failedCount} scores haven't`} saved yet. Check your
              internet connection. We'll keep trying.
            </Alert>
          )}
          <ScoreGrid sheet={sheet} views={cells.views} totals={totals} readOnly={locked} onCommit={cells.commit} />
        </div>

        <aside className="shrink-0 space-y-4 lg:sticky lg:top-8 lg:w-64">
          <div className="space-y-3 rounded-3xl bg-surface p-5 shadow-raised">
            <p className="text-base">
              <span className="font-semibold tabular-nums">
                {completeTotals.length} of {sheet.rows.length}
              </span>{" "}
              <span className="text-text-secondary">students done</span>
            </p>
            <RegisterStrip total={sheet.rows.length} filled={completeTotals.length} />
          </div>

          <div className="rounded-3xl bg-surface p-5 shadow-raised">
            <GradeDistribution totals={completeTotals} scale={sheet.gradingScale} />
          </div>

          {!locked && status !== "COMPLETE" && (
            <div className="space-y-3 rounded-3xl bg-surface p-5 shadow-raised">
              <Button
                className="w-full"
                onClick={() => markComplete.mutate()}
                disabled={!everyoneEntered || cells.hasUnsavedWork}
                loading={markComplete.isPending}
              >
                Mark as complete
              </Button>
              {markComplete.error ? (
                <Alert tone="danger">{markComplete.error.message}</Alert>
              ) : (
                <p className="text-xs leading-relaxed text-text-muted">
                  Lets your school admin know this class is ready to review.
                </p>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function BackLink({ hasUnsavedWork }: { hasUnsavedWork: boolean }) {
  return (
    <Link
      to="/teacher"
      onClick={(event) => {
        if (hasUnsavedWork && !window.confirm("Some scores haven't saved yet. Leave this page anyway?")) {
          event.preventDefault();
        }
      }}
      className="-ml-1 inline-flex items-center gap-1 rounded-md px-1 text-sm text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <ChevronLeft className="h-4 w-4" />
      My classes
    </Link>
  );
}

/** Asks before closing or reloading the tab while scores are still saving. */
function useWarnBeforeLeaving(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active]);
}
