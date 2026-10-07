import type { SaveScoreRequest } from "@brillanda/shared-types";
import { screen, waitFor, within } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { MOCK_ARMS, MOCK_COMPONENTS, MOCK_TERM, loadDb, readMockCell, saveDb, sheetKey } from "../../../mocks/db";
import { renderWithProviders } from "../../../test/render";
import { server } from "../../../test/server";
import { ScoreEntryPage } from "./ScoreEntryPage";

const [JSS1A, JSS1B] = MOCK_ARMS;
const FIRST = JSS1A!.students[0]!;
const SECOND = JSS1A!.students[1]!;
const SAVE_URL = "/api/v1/scores/:studentId/:componentId";

function renderSheet(armId = "arm-jss1a", subjectId = "subject-maths") {
  return renderWithProviders(<ScoreEntryPage />, {
    route: `/teacher/score-entry/${armId}/${subjectId}/${MOCK_TERM.id}`,
    path: "/teacher/score-entry/:armId/:subjectId/:termId",
  });
}

const findCell = (student: { fullName: string }, component: string) =>
  screen.findByLabelText<HTMLInputElement>(`${component} for ${student.fullName}`);

/** Records each save request, then lets the stand-in API handle it. */
function recordSaves() {
  const saves: SaveScoreRequest[] = [];
  server.use(
    http.put(SAVE_URL, async ({ request }) => {
      saves.push((await request.clone().json()) as SaveScoreRequest);
    }),
  );
  return saves;
}

describe("score entry grid", () => {
  it("lists every student with a cell for each component", async () => {
    renderSheet();
    expect(await screen.findByRole("heading", { name: "Mathematics" })).toBeInTheDocument();
    expect(screen.getByText("JSS 1A, First Term 2026/2027")).toBeInTheDocument();
    for (const student of JSS1A!.students) {
      expect(screen.getByLabelText(`CA1 for ${student.fullName}`)).toBeInTheDocument();
    }
    expect(screen.getByRole("columnheader", { name: /Exam\s*out of 60/ })).toBeInTheDocument();
  });

  it("refuses a score above the maximum without saving it, and stays on the cell", async () => {
    const saves = recordSaves();
    const { user } = renderSheet();
    const input = await findCell(FIRST, "CA1");

    await user.type(input, "25{Enter}");

    expect(await screen.findByText("Must be 20 or less")).toBeInTheDocument();
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(saves).toEqual([]);
  });

  it("saves on Enter and moves down to the next student", async () => {
    const saves = recordSaves();
    const { user } = renderSheet();

    await user.type(await findCell(FIRST, "CA1"), "15{Enter}");

    expect(await findCell(SECOND, "CA1")).toHaveFocus();
    await waitFor(() =>
      expect(readMockCell("arm-jss1a", "subject-maths", FIRST.studentId, "component-ca1")).toEqual({
        value: 15,
        isAbsent: false,
      }),
    );
    expect(saves).toEqual([{ subjectId: "subject-maths", termId: MOCK_TERM.id, value: 15, isAbsent: false }]);
  });

  it("moves across with Tab and saves what was typed", async () => {
    const saves = recordSaves();
    const { user } = renderSheet();

    await user.type(await findCell(FIRST, "CA1"), "12");
    await user.tab();

    expect(await findCell(FIRST, "CA2")).toHaveFocus();
    await waitFor(() => expect(saves).toHaveLength(1));
  });

  it("shows the total and grade once every component is in", async () => {
    const { user } = renderSheet();

    await user.type(await findCell(FIRST, "CA1"), "15");
    await user.tab();
    await user.keyboard("18");
    await user.tab();
    await user.keyboard("50");
    await user.tab();

    const row = (await findCell(FIRST, "CA1")).closest("tr")!;
    expect(await within(row).findByText("83")).toBeInTheDocument();
    expect(within(row).getByText("A")).toBeInTheDocument();
  });

  it("accepts ABS for an absent student", async () => {
    const saves = recordSaves();
    const { user } = renderSheet();
    const input = await findCell(FIRST, "Exam");

    await user.type(input, "abs{Enter}");

    expect(input).toHaveValue("ABS");
    await waitFor(() => expect(saves).toEqual([expect.objectContaining({ value: null, isAbsent: true })]));
  });

  it("never lets a slow save overwrite a newer score", async () => {
    const sent: Array<number | null> = [];
    server.use(
      http.put(SAVE_URL, async ({ request }) => {
        sent.push(((await request.clone().json()) as SaveScoreRequest).value);
        await new Promise((resolve) => setTimeout(resolve, 80));
      }),
    );
    const { user } = renderSheet();
    const input = await findCell(FIRST, "CA1");

    await user.type(input, "10{Enter}");
    await user.clear(input);
    await user.type(input, "12{Enter}");

    await waitFor(() =>
      expect(readMockCell("arm-jss1a", "subject-maths", FIRST.studentId, "component-ca1")).toEqual({
        value: 12,
        isAbsent: false,
      }),
    );
    expect(sent).toEqual([10, 12]);
  });

  it("keeps a locked sheet read-only", async () => {
    renderSheet("arm-jss1b", "subject-maths");

    expect(await screen.findByText(/has locked these scores/)).toBeInTheDocument();
    expect(screen.getByLabelText(`CA1 for ${JSS1B!.students[0]!.fullName}`)).toHaveAttribute("readonly");
    expect(screen.queryByRole("button", { name: "Mark as complete" })).not.toBeInTheDocument();
  });

  it("allows Mark as complete only once every score is in", async () => {
    const state = loadDb()[sheetKey("arm-jss1a", "subject-maths")]!;
    for (const student of JSS1A!.students) {
      state.scores[student.studentId] = Object.fromEntries(
        MOCK_COMPONENTS.map((component) => [component.id, { value: 10, isAbsent: false }]),
      );
    }
    const last = JSS1A!.students.at(-1)!;
    delete state.scores[last.studentId]!["component-exam"];
    state.status = "IN_PROGRESS";
    saveDb();

    const { user } = renderSheet();
    const button = await screen.findByRole("button", { name: "Mark as complete" });
    expect(button).toBeDisabled();

    await user.type(await findCell(last, "Exam"), "40{Enter}");
    await waitFor(() => expect(button).toBeEnabled());
    await user.click(button);

    expect(await screen.findByText(/Marked as complete/)).toBeInTheDocument();
  });

  it("flags a save that failed and retries it on request", async () => {
    server.use(http.put(SAVE_URL, () => HttpResponse.error(), { once: true }));
    const { user } = renderSheet();

    await user.type(await findCell(FIRST, "CA1"), "15{Enter}");
    expect(await screen.findByText(/1 score hasn't saved yet/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Try again" }));

    await waitFor(() => expect(screen.queryByText(/hasn't saved yet/)).not.toBeInTheDocument());
    expect(readMockCell("arm-jss1a", "subject-maths", FIRST.studentId, "component-ca1")).toEqual({
      value: 15,
      isAbsent: false,
    });
  });
});
