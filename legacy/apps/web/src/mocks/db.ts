import type {
  CellValue,
  EntryState,
  GradeBand,
  ScoreSheetComponent,
  ScoreSheetRow,
  TermRef,
} from "@brillanda/shared-types";

// Stand-in data for screens whose API isn't built yet (DECISIONS.md D-7). It mirrors the demo
// school in apps/api/prisma/seed.ts and persists in localStorage, so autosaved scores survive a
// reload. Delete each piece when its real endpoint ships.

export const MOCK_TERM: TermRef = { id: "term-first-2026", name: "First Term", sessionName: "2026/2027" };

export const MOCK_COMPONENTS: ScoreSheetComponent[] = [
  { id: "component-ca1", name: "CA1", weight: 20, maxScore: 20 },
  { id: "component-ca2", name: "CA2", weight: 20, maxScore: 20 },
  { id: "component-exam", name: "Exam", weight: 60, maxScore: 60 },
];

export const MOCK_GRADING_SCALE: GradeBand[] = [
  { minScore: 70, grade: "A", remark: "Excellent", isPass: true },
  { minScore: 60, grade: "B", remark: "Very Good", isPass: true },
  { minScore: 50, grade: "C", remark: "Good", isPass: true },
  { minScore: 45, grade: "D", remark: "Fair", isPass: true },
  { minScore: 40, grade: "E", remark: "Pass", isPass: true },
  { minScore: 0, grade: "F", remark: "Fail", isPass: false },
];

type MockStudent = Omit<ScoreSheetRow, "scores">;
type MockArm = { id: string; name: string; className: string; students: MockStudent[] };

const students = (prefix: string, names: string[]): MockStudent[] =>
  names.map((fullName, index) => ({
    studentId: `student-${prefix}-${index + 1}`,
    admissionNo: `BDA/2026/${prefix === "1a" ? "0" : "1"}${String(index + 1).padStart(2, "0")}`,
    fullName,
  }));

export const MOCK_ARMS: MockArm[] = [
  {
    id: "arm-jss1a",
    name: "JSS 1A",
    className: "JSS 1",
    students: students("1a", [
      "Chiamaka Obi", "Emeka Nwosu", "Fatima Bello", "Ibrahim Musa", "Oluwaseun Adeyemi",
      "Ngozi Eze", "Adebayo Ogunleye", "Zainab Abubakar", "Chinedu Okeke", "Temitope Alabi",
    ]),
  },
  {
    id: "arm-jss1b",
    name: "JSS 1B",
    className: "JSS 1",
    students: students("1b", [
      "Aisha Lawal", "Bolaji Okonkwo", "Chidinma Uzor", "Damilola Ajayi", "Efe Omoregie", "Farouk Sani",
      "Gift Ekanem", "Halima Garba", "Ikenna Nnaji", "Jumoke Adebisi", "Kelechi Ibe", "Lami Yakubu",
    ]),
  },
];

export const MOCK_SUBJECTS: Record<string, string> = {
  "subject-maths": "Mathematics",
  "subject-basic-science": "Basic Science",
  "subject-english": "English Language",
};

/** The signed-in teacher's classes in the stand-in data. */
export const MOCK_ASSIGNMENTS = [
  { armId: "arm-jss1a", subjectId: "subject-maths" },
  { armId: "arm-jss1a", subjectId: "subject-basic-science" },
  { armId: "arm-jss1b", subjectId: "subject-maths" },
];

type SheetState = {
  status: EntryState;
  /** studentId → componentId → cell */
  scores: Record<string, Record<string, CellValue>>;
};
type MockDb = Record<string, SheetState>;

export const sheetKey = (armId: string, subjectId: string) => `${armId}|${subjectId}`;

const STORAGE_KEY = "brillanda-sample-data-v1";

/** Believable, repeatable scores for the first `count` students. */
function sampleScores(list: MockStudent[], count: number): SheetState["scores"] {
  return Object.fromEntries(
    list.slice(0, count).map((student, i) => [
      student.studentId,
      {
        "component-ca1": { value: 10 + ((i * 7) % 11), isAbsent: false },
        "component-ca2": { value: 9 + ((i * 5) % 12), isAbsent: false },
        "component-exam": { value: 24 + ((i * 13) % 37), isAbsent: false },
      },
    ]),
  );
}

function initialDb(): MockDb {
  const [jss1a, jss1b] = MOCK_ARMS;
  return {
    [sheetKey("arm-jss1a", "subject-maths")]: { status: "NOT_STARTED", scores: {} },
    [sheetKey("arm-jss1a", "subject-basic-science")]: { status: "IN_PROGRESS", scores: sampleScores(jss1a!.students, 6) },
    [sheetKey("arm-jss1b", "subject-maths")]: {
      status: "LOCKED",
      scores: sampleScores(jss1b!.students, jss1b!.students.length),
    },
  };
}

let db: MockDb | null = null;

export function loadDb(): MockDb {
  if (db) return db;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return (db = JSON.parse(stored) as MockDb);
  } catch {
    // Storage unavailable (private window): fall back to fresh sample data.
  }
  return (db = initialDb());
}

export function saveDb(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Storage unavailable: changes last until the page reloads.
  }
}

export function resetMockDb(): void {
  db = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear.
  }
}

export function readMockCell(armId: string, subjectId: string, studentId: string, componentId: string) {
  return loadDb()[sheetKey(armId, subjectId)]?.scores[studentId]?.[componentId] ?? null;
}
