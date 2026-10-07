import { delay, http, HttpResponse } from "msw";
import type {
  MarkCompleteResponse,
  SaveScoreRequest,
  SaveScoreResponse,
  ScoreSheet,
  TeacherAssignmentsResponse,
} from "@brillanda/shared-types";
import {
  MOCK_ARMS,
  MOCK_ASSIGNMENTS,
  MOCK_COMPONENTS,
  MOCK_GRADING_SCALE,
  MOCK_SUBJECTS,
  MOCK_TERM,
  loadDb,
  saveDb,
  sheetKey,
} from "./db";

// Stand-ins for the teacher endpoints in packages/shared-types/src/teacher.ts. Delete this file
// once the scores module ships in the API.

const notFound = () => HttpResponse.json({ error: "Not found" }, { status: 404 });
const lockedResponse = () =>
  HttpResponse.json({ error: "These scores are locked. Ask your school admin to unlock them." }, { status: 409 });

function sheetState(armId: string, subjectId: string) {
  const arm = MOCK_ARMS.find((candidate) => candidate.id === armId);
  const state = loadDb()[sheetKey(armId, subjectId)];
  return arm && state ? { arm, state } : null;
}

function countComplete(armId: string, subjectId: string): number {
  const found = sheetState(armId, subjectId);
  if (!found) return 0;
  return found.arm.students.filter((student) =>
    MOCK_COMPONENTS.every((component) => found.state.scores[student.studentId]?.[component.id]),
  ).length;
}

export const teacherHandlers = [
  http.get("/api/v1/teacher/assignments", async () => {
    await delay();
    const assignments = MOCK_ASSIGNMENTS.flatMap(({ armId, subjectId }) => {
      const found = sheetState(armId, subjectId);
      if (!found) return [];
      return [
        {
          armId,
          armName: found.arm.name,
          className: found.arm.className,
          subjectId,
          subjectName: MOCK_SUBJECTS[subjectId] ?? subjectId,
          termId: MOCK_TERM.id,
          status: found.state.status,
          studentCount: found.arm.students.length,
          studentsComplete: countComplete(armId, subjectId),
        },
      ];
    });
    return HttpResponse.json<TeacherAssignmentsResponse>({ term: MOCK_TERM, assignments });
  }),

  http.get("/api/v1/scores", async ({ request }) => {
    await delay();
    const params = new URL(request.url).searchParams;
    const armId = params.get("armId") ?? "";
    const subjectId = params.get("subjectId") ?? "";
    const assigned = MOCK_ASSIGNMENTS.some((a) => a.armId === armId && a.subjectId === subjectId);
    const found = sheetState(armId, subjectId);
    if (!assigned || !found || params.get("termId") !== MOCK_TERM.id) return notFound();

    return HttpResponse.json<ScoreSheet>({
      arm: { id: found.arm.id, name: found.arm.name, className: found.arm.className },
      subject: { id: subjectId, name: MOCK_SUBJECTS[subjectId] ?? subjectId },
      term: MOCK_TERM,
      status: found.state.status,
      components: MOCK_COMPONENTS,
      gradingScale: MOCK_GRADING_SCALE,
      rows: found.arm.students.map((student) => ({ ...student, scores: found.state.scores[student.studentId] ?? {} })),
    });
  }),

  http.put<{ studentId: string; componentId: string }, SaveScoreRequest>(
    "/api/v1/scores/:studentId/:componentId",
    async ({ params, request }) => {
      await delay();
      const body = await request.json();
      const arm = MOCK_ARMS.find((candidate) => candidate.students.some((s) => s.studentId === params.studentId));
      const component = MOCK_COMPONENTS.find((candidate) => candidate.id === params.componentId);
      const found = arm && sheetState(arm.id, body.subjectId);
      if (!arm || !component || !found || body.termId !== MOCK_TERM.id) return notFound();
      if (found.state.status === "LOCKED") return lockedResponse();

      const value = body.value;
      if (!body.isAbsent && value !== null && !(value >= 0 && value <= component.maxScore)) {
        return HttpResponse.json(
          { error: "Validation failed", fields: { value: [`Must be ${component.maxScore} or less`] } },
          { status: 400 },
        );
      }

      const row = (found.state.scores[params.studentId] ??= {});
      const cell = body.isAbsent ? { value: 0, isAbsent: true } : value === null ? null : { value, isAbsent: false };
      if (cell) row[component.id] = cell;
      else delete row[component.id];

      const everyoneIn = countComplete(arm.id, body.subjectId) === arm.students.length;
      if (found.state.status === "NOT_STARTED" && cell) found.state.status = "IN_PROGRESS";
      if (found.state.status === "COMPLETE" && !everyoneIn) found.state.status = "IN_PROGRESS";
      saveDb();

      return HttpResponse.json<SaveScoreResponse>({ cell, status: found.state.status });
    },
  ),

  http.post<{ armId: string; subjectId: string; termId: string }>(
    "/api/v1/scores/arm/:armId/subject/:subjectId/term/:termId/mark-complete",
    async ({ params }) => {
      await delay();
      const found = sheetState(params.armId, params.subjectId);
      if (!found || params.termId !== MOCK_TERM.id) return notFound();
      if (found.state.status === "LOCKED") return lockedResponse();

      const empty = found.arm.students.reduce(
        (sum, student) =>
          sum + MOCK_COMPONENTS.filter((component) => !found.state.scores[student.studentId]?.[component.id]).length,
        0,
      );
      if (empty > 0) {
        return HttpResponse.json(
          {
            error: `${empty} ${empty === 1 ? "score is" : "scores are"} still empty. Enter them, or ABS for absent students, first.`,
          },
          { status: 409 },
        );
      }

      found.state.status = "COMPLETE";
      saveDb();
      return HttpResponse.json<MarkCompleteResponse>({ status: "COMPLETE" });
    },
  ),
];
