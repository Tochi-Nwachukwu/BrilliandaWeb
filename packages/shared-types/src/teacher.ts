import type { CellValue, GradeBand } from "./grading";
import type { EntryState } from "./index";

// API contract for the teacher portal (DECISIONS.md F-30). The web app is built against these
// shapes with stand-in data first; the API must return exactly these when the endpoints ship.

export type TermRef = { id: string; name: string; sessionName: string };

/** One (arm, subject) pair the teacher enters scores for. */
export type TeacherAssignment = {
  armId: string;
  armName: string;
  className: string;
  subjectId: string;
  subjectName: string;
  termId: string;
  status: EntryState;
  studentCount: number;
  /** Students with every component entered. */
  studentsComplete: number;
};

/** GET /teacher/assignments: the teacher's assignments for the active term. */
export type TeacherAssignmentsResponse = {
  term: TermRef | null;
  assignments: TeacherAssignment[];
};

export type ScoreSheetComponent = { id: string; name: string; weight: number; maxScore: number };

export type ScoreSheetRow = {
  studentId: string;
  admissionNo: string;
  fullName: string;
  /** By component id. A missing key means not entered yet. */
  scores: Partial<Record<string, CellValue>>;
};

/** GET /scores?armId=&subjectId=&termId= */
export type ScoreSheet = {
  arm: { id: string; name: string; className: string };
  subject: { id: string; name: string };
  term: TermRef;
  status: EntryState;
  components: ScoreSheetComponent[];
  gradingScale: GradeBand[];
  rows: ScoreSheetRow[];
};

/** PUT /scores/:studentId/:componentId. `value: null` with `isAbsent: false` clears the cell. */
export type SaveScoreRequest = {
  subjectId: string;
  termId: string;
  value: number | null;
  isAbsent: boolean;
};

export type SaveScoreResponse = { cell: CellValue | null; status: EntryState };

/** POST /scores/arm/:armId/subject/:subjectId/term/:termId/mark-complete */
export type MarkCompleteResponse = { status: EntryState };
