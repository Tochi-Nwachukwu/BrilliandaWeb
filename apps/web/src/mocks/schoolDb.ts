import { defaultAdmissionPattern, formatAdmissionNo, type EntryState, type Gender, type GradeBand, type GuardianDetails, type ParentStatus, type SchoolProfile, type PromotionDecision, type SessionTerm, type StudentEvent, type StudentNote, type StudentStatus, type TermDates, type TermRef } from "@brillanda/shared-types";
import { MOCK_COMPONENTS, MOCK_GRADING_SCALE, MOCK_TERM } from "./db";

// Stand-in data for the school admin portal (DECISIONS.md D-7, F-37): one whole school, 12 arms
// and 9 subjects, generated from a fixed seed so every run looks the same. Kept in localStorage so
// changes survive a reload. The teacher portal still has its own small sample (mocks/db.ts); the
// two join up once the real API serves both. Delete this file when the admin endpoints ship.
//
// A second school, Sunrise Academy, has only the defaults a new school is created with, so the
// first run and setup checklist can be tried (F-39). Requests go to it when the "New school"
// sample account is signed in.

export type SchoolKey = "greenfield" | "sunrise";
const STORAGE_KEYS: Record<SchoolKey, string> = { greenfield: "brillanda:school-v4", sunrise: "brillanda:new-school-v2" };
/** Part of the access token the "New school" sample account signs in with. */
export const NEW_SCHOOL_TOKEN_MARK = "new-school";
const DAY = 86_400_000;

/** A score cell: a number, "ABS" for absent, or null for not entered yet. */
export type Cell = number | "ABS" | null;
export type Sheet = { status: EntryState; scores: Record<string, [Cell, Cell, Cell]>; remindedAt: string | null };
export type StaffRecord = { id: string; fullName: string; email: string; role: "TEACHER" | "SCHOOL_ADMIN"; status: "ACTIVE" | "INVITED" };
export type UnlockRecord = { id: string; armId: string; subjectId: string; reason: string; requestedById: string; createdAt: string; status: "PENDING" | "APPROVED" | "REJECTED" };

export type StudentRow = {
  id: string;
  fullName: string;
  admissionNo: string;
  /** Their current arm, or their last one once they have left. */
  armId: string;
  parentStatus: ParentStatus;
  gender: Gender | null;
  dob: string | null;
  guardian: GuardianDetails;
  joinedOn: string;
  status: StudentStatus;
  left: { on: string; reason: string | null } | null;
  /** Added with the student page (F-42); absent on records saved before it. */
  photoUrl?: string | null;
  events?: StudentEvent[];
  notes?: StudentNote[];
  /** Their class in each finished session, recorded at promotion (F-44); before that it's worked out. */
  pastClasses?: { sessionName: string; armName: string }[];
};

/** Where the school is in getting set up. `imported` is set by the student import (step 4). */
export type SetupState = { firstRunDone: boolean; checklistHidden: boolean; gradingChecked: boolean; termSet: boolean; imported: boolean };

export type SchoolDb = {
  id: SchoolKey;
  setup: SetupState;
  profile: SchoolProfile;
  term: TermDates;
  scale: GradeBand[];
  classes: { id: string; name: string; order: number }[];
  arms: { id: string; name: string; classId: string; formTeacherId: string }[];
  subjects: { id: string; name: string }[];
  staff: StaffRecord[];
  /** Who teaches each subject in each arm, by `${armId}:${subjectId}`. */
  teacherOf: Record<string, string>;
  students: StudentRow[];
  /** How admission numbers are made, and the running count (F-40). */
  admission: { pattern: string; digits: number; next: number };
  sheets: Record<string, Sheet>;
  unlocks: UnlockRecord[];
  /** When each arm was published, by arm id. */
  published: Record<string, string>;
  /** Published terms a parent has opened, as `${studentId}:${termId}` (the parent portal's "New" markers). */
  parentSeen: string[];
  /** This session's terms (F-43). Filled in by loadSchool for records saved before sessions. */
  session: { startYear?: number; terms: SessionTerm[] };
  /** The pass mark for moving up a class at the end of a session, and decisions changed by hand (F-44). */
  promotion?: { passMark: number | null; decisions: Record<string, { decision: PromotionDecision; reason: string | null }> };
  /** Terms closed this session, with their sheets and publishing as they were at closing. */
  closedTerms: ClosedTerm[];
};

/** A closed term kept whole, so its results can still be worked out. `armOf` is each student's arm then. */
export type ClosedTerm = { term: TermRef; sheets: Record<string, Sheet>; published: Record<string, string>; armOf: Record<string, string> };

/** The sample parent's children: real students of the sample school, so publishing reaches them. */
export const SAMPLE_CHILDREN = [
  { id: "student-chiamaka", fullName: "Chiamaka Okafor", armId: "arm-jss2b", ability: 76 },
  { id: "student-obinna", fullName: "Obinna Okafor", armId: "arm-ss3a", ability: 66 },
];

export const sheetId = (armId: string, subjectId: string) => `${armId}:${subjectId}`;
export const COMPONENTS = MOCK_COMPONENTS;
/** The first term of the sample session; use termOf(db) for the term a school is in now. */
export const TERM = MOCK_TERM;
export const TERM_NAMES = ["First Term", "Second Term", "Third Term"];
const TERM_IDS = ["first", "second", "third"];

/** A session's three terms, the first one current, from that term's dates. */
export function defaultSession(dates: Pick<TermDates, "startsOn" | "endsOn">, startYear = SESSION_START_YEAR): SchoolDb["session"] {
  return {
    startYear,
    terms: TERM_NAMES.map((name, i) => ({
      id: `term-${TERM_IDS[i]}-${startYear}`,
      name,
      status: i === 0 ? "CURRENT" : "UPCOMING",
      startsOn: i === 0 ? dates.startsOn : null,
      endsOn: i === 0 ? dates.endsOn : null,
      closedOn: null,
    })),
  };
}

/**
 * The school as it was when a term closed, for working out that term's results: that term's sheets
 * and publishing, and each student in the arm they were in then. Students who joined later are left out.
 */
export function asClosed(db: SchoolDb, closed: ClosedTerm): SchoolDb {
  return {
    ...db,
    sheets: closed.sheets,
    published: closed.published,
    students: db.students.map((s) => (closed.armOf[s.id] ? { ...s, armId: closed.armOf[s.id]!, status: "ACTIVE" } : { ...s, status: "WITHDRAWN" })),
  };
}

/** The term the school is in now: the current one, or the last closed one between terms. */
export function termOf(db: SchoolDb): TermRef {
  const terms = db.session.terms;
  const t = terms.find((x) => x.status === "CURRENT") ?? [...terms].reverse().find((x) => x.status === "CLOSED") ?? terms[0]!;
  return { id: t.id, name: t.name, sessionName: sessionNameOf(db) };
}

/** "2026/2027" for the session a school is in. */
export const sessionNameOf = (db: SchoolDb) => `${sessionStartYear(db)}/${sessionStartYear(db) + 1}`;

export function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ["Adaeze", "Ifeanyi", "Tolu", "Zainab", "David", "Chisom", "Emeka", "Fatima", "Olumide", "Kemi", "Sade", "Musa", "Halima", "Ebuka", "Amaka", "Yusuf", "Blessing", "Tobi", "Femi", "Aisha", "Uche", "Nneka", "Segun", "Bisola", "Ikenna", "Temi", "Ada", "Funke", "Kelechi", "Nkechi", "Seun", "Dayo", "Ireti", "Somto", "Hauwa", "Precious", "Daniel", "Esther", "Joshua", "Grace", "Victor", "Ruth", "Samuel", "Deborah", "Ibrahim", "Maryam", "Chidi", "Oluwaseun"];
const LAST = ["Adeyemi", "Bello", "Eze", "Nwosu", "Okon", "Danjuma", "Ibe", "Lawal", "Adewale", "Obi", "Yusuf", "Etim", "Nnaji", "Balogun", "Uzor", "Ogunleye", "Abubakar", "Chukwu", "Ojo", "Afolabi", "Onyeka", "Salami", "Mohammed", "Olatunji", "Akande", "Nwachukwu", "Oyelaran", "Ekanem", "Okoro", "Ajayi"];

const FEMALE = new Set(["Adaeze", "Zainab", "Chisom", "Fatima", "Kemi", "Sade", "Halima", "Amaka", "Blessing", "Aisha", "Nneka", "Bisola", "Temi", "Ada", "Funke", "Nkechi", "Ireti", "Hauwa", "Precious", "Esther", "Grace", "Ruth", "Deborah", "Maryam", "Chiamaka"]);
/** The year both sample schools are in when first seeded. Earlier sessions are made-up history. */
export const SAMPLE_START_YEAR = Number(MOCK_TERM.sessionName.slice(0, 4));
const SESSION_START_YEAR = SAMPLE_START_YEAR;

/** A seeded student with believable details: JSS 1 joined this year, SS 3 five years ago. */
function sampleStudent(r: () => number, { id, fullName, armId, classOrder, linked }: { id: string; fullName: string; armId: string; classOrder: number; linked: boolean }): StudentRow {
  const joinedYear = SESSION_START_YEAR - classOrder;
  const last = fullName.split(" ").at(-1)!;
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    id,
    fullName,
    admissionNo: "", // numbered in admission order once everyone is seeded
    armId,
    parentStatus: linked ? "LINKED" : "NONE",
    gender: FEMALE.has(fullName.split(" ")[0]!) ? "FEMALE" : "MALE",
    dob: `${joinedYear - 11}-${pad(1 + Math.floor(r() * 12))}-${pad(1 + Math.floor(r() * 28))}`,
    guardian: {
      name: `${r() < 0.5 ? "Mrs" : "Mr"} ${last}`,
      phone: `080${String(Math.floor(r() * 1e8)).padStart(8, "0")}`,
      email: linked ? `${last.toLowerCase()}.family${Math.floor(r() * 90 + 10)}@gmail.com` : null,
    },
    joinedOn: `${joinedYear}-09-14`,
    status: "ACTIVE",
    left: null,
  };
}

function seed(now = Date.now()): SchoolDb {
  const r = rng(2026);
  // A separate sequence for names' details, so adding them never changes the sample results.
  const details = rng(4049);
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);

  const classes = ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"].map((name, order) => ({ id: `class-${order + 1}`, name, order }));
  const subjects = [
    ["subject-maths", "Mathematics"], ["subject-english", "English Language"], ["subject-computer", "Computer Studies"],
    ["subject-agric", "Agricultural Science"], ["subject-phe", "Physical and Health Education"], ["subject-civic", "Civic Education"],
    ["subject-crs", "Christian Religious Studies"], ["subject-french", "French"], ["subject-yoruba", "Yoruba"],
  ].map(([id, name]) => ({ id: id!, name: name! }));

  const staff: StaffRecord[] = [
    ["t-bakare", "Tunde Bakare"], ["t-ajayi", "Femi Ajayi"], ["t-okon", "Grace Okon"], ["t-bello", "Halima Bello"], ["t-eze", "Chinedu Eze"],
    ["t-nwosu", "Emeka Nwosu"], ["t-danjuma", "Musa Danjuma"], ["t-ibe", "Ngozi Ibe"], ["t-lawal", "Aisha Lawal"], ["t-adewale", "Bisi Adewale"],
  ].map(([id, fullName]) => ({ id: id!, fullName: fullName!, email: `${fullName!.split(" ")[0]![0]!.toLowerCase()}.${fullName!.split(" ")[1]!.toLowerCase()}@greenfield.sch.ng`, role: "TEACHER", status: "ACTIVE" }));
  staff.push({ id: "a-adeyemi", fullName: "Funmilayo Adeyemi", email: "f.adeyemi@greenfield.sch.ng", role: "SCHOOL_ADMIN", status: "ACTIVE" });

  const subjectTeacher: Record<string, string> = {
    "subject-english": "t-okon", "subject-computer": "t-bello", "subject-agric": "t-eze", "subject-phe": "t-nwosu",
    "subject-civic": "t-danjuma", "subject-crs": "t-ibe", "subject-french": "t-lawal", "subject-yoruba": "t-adewale",
  };
  const bakareArms = ["arm-jss2a", "arm-jss2b", "arm-ss1a", "arm-ss2a"];
  const formTeachers = ["t-okon", "t-bello", "t-bakare", "t-danjuma", "t-eze", "t-ibe", "t-nwosu", "t-lawal", "t-adewale", "t-okon", "t-danjuma", "t-bello"];

  const arms = classes.flatMap((cls) =>
    ["A", "B"].map((letter) => ({ id: `arm-${cls.name.replace(" ", "").toLowerCase()}${letter.toLowerCase()}`, name: `${cls.name}${letter}`, classId: cls.id, formTeacherId: "" })),
  );
  arms.forEach((arm, i) => (arm.formTeacherId = formTeachers[i]!));

  const teacherOf: Record<string, string> = {};
  for (const arm of arms) for (const s of subjects) teacherOf[sheetId(arm.id, s.id)] = s.id === "subject-maths" ? (bakareArms.includes(arm.id) ? "t-bakare" : "t-ajayi") : subjectTeacher[s.id]!;

  const used = new Set<string>();
  const students: SchoolDb["students"] = [];
  const ability: Record<string, number> = {};
  arms.forEach((arm, ai) => {
    const n = 26 + Math.floor(r() * 9);
    for (let k = 0; k < n; k++) {
      let name: string;
      do name = `${FIRST[Math.floor(r() * FIRST.length)]} ${LAST[Math.floor(r() * LAST.length)]}`; while (used.has(name));
      used.add(name);
      const id = `student-${arm.id.slice(4)}-${k + 1}`;
      ability[id] = Math.max(28, Math.min(95, 62 + (r() + r() + r() - 1.5) * 34));
      const linked = r() < 0.93;
      students.push(sampleStudent(details, { id, fullName: name, armId: arm.id, classOrder: Math.floor(ai / 2), linked }));
    }
  });
  for (const child of SAMPLE_CHILDREN) {
    const s = students.find((x) => x.armId === child.armId)!;
    delete ability[s.id];
    Object.assign(s, {
      id: child.id,
      fullName: child.fullName,
      parentStatus: "LINKED",
      gender: FEMALE.has(child.fullName.split(" ")[0]!) ? "FEMALE" : "MALE",
      guardian: { name: "Mrs Ngozi Okafor", phone: "08031234567", email: "parent@greenfield.sample" },
    });
    ability[child.id] = child.ability;
  }
  students.sort((a, b) => (a.armId === b.armId ? a.fullName.split(" ")[1]!.localeCompare(b.fullName.split(" ")[1]!) : 0));

  // Admission numbers run on from year to year, in the order students joined.
  const admission = { pattern: "GC/{YEAR}/{NUMBER}", digits: 4, next: 1 };
  const byClassOrder = (st: StudentRow) => classes.find((c) => c.id === arms.find((a) => a.id === st.armId)!.classId)!.order;
  for (const st of [...students].sort((a, b) => byClassOrder(b) - byClassOrder(a))) {
    st.admissionNo = formatAdmissionNo(admission, Number(st.joinedOn.slice(0, 4)), admission.next++);
  }

  // Where each sheet stands, then scores to match.
  const state: Record<string, { status: EntryState; share: number }> = {};
  for (const arm of arms) for (const s of subjects) {
    const x = r();
    state[sheetId(arm.id, s.id)] = x < 0.1 ? { status: "NOT_STARTED", share: 0 } : x < 0.36 ? { status: "IN_PROGRESS", share: 0.25 + r() * 0.65 } : { status: "COMPLETE", share: 1 };
  }
  const set = (armId: string, subjectId: string, status: EntryState, share: number) => (state[sheetId(armId, subjectId)] = { status, share });
  for (const s of subjects) { set("arm-jss1a", s.id, "COMPLETE", 1); set("arm-ss3a", s.id, "COMPLETE", 1); }
  subjects.slice(0, 3).forEach((s) => set("arm-ss3b", s.id, "LOCKED", 1));
  subjects.forEach((s, i) => { if (i % 3 !== 1) set("arm-jss2b", s.id, i % 2 ? "NOT_STARTED" : "IN_PROGRESS", i % 2 ? 0 : 0.18 + i * 0.04); });
  set("arm-jss2a", "subject-maths", "IN_PROGRESS", 1);
  set("arm-jss2b", "subject-maths", "IN_PROGRESS", 0.58);
  set("arm-ss1a", "subject-maths", "NOT_STARTED", 0);
  set("arm-ss2a", "subject-maths", "LOCKED", 1);
  // A teacher can only ask to reopen a sheet they have marked complete (the two requests below).
  set("arm-jss3a", "subject-agric", "COMPLETE", 1);
  set("arm-ss2b", "subject-english", "COMPLETE", 1);

  const sheets: Record<string, Sheet> = {};
  for (const arm of arms) for (const s of subjects) {
    const key = sheetId(arm.id, s.id);
    const list = students.filter((st) => st.armId === arm.id);
    const full = Math.round(list.length * state[key]!.share);
    const scores: Sheet["scores"] = {};
    list.forEach((st, i) => {
      const score = (max: number) => Math.round((max * Math.max(8, Math.min(100, ability[st.id]! + (r() - 0.5) * 26))) / 100);
      if (i < full) scores[st.id] = [score(20), score(20), r() < 0.012 ? "ABS" : score(60)];
      else if (i === full && state[key]!.status === "IN_PROGRESS") scores[st.id] = [score(20), null, null];
      else scores[st.id] = [null, null, null];
    });
    sheets[key] = { status: state[key]!.status, scores, remindedAt: null };
  }

  // Two who have left, so the school's records show former students too.
  const leaver = (fullName: string, armId: string, classOrder: number, status: StudentStatus, daysAgo: number, reason: string): StudentRow => ({
    ...sampleStudent(details, { id: `student-left-${students.length}`, fullName, armId, classOrder, linked: true }),
    admissionNo: formatAdmissionNo(admission, SESSION_START_YEAR - classOrder, admission.next++),
    status,
    left: { on: iso(now - daysAgo * DAY), reason },
  });
  students.push(
    leaver("Kunle Fashola", "arm-jss3b", 2, "TRANSFERRED", 40, "Family moved to Abuja."),
    leaver("Ngozi Uchenna", "arm-ss1b", 3, "WITHDRAWN", 18, "Fees not paid for the term."),
  );

  return {
    id: "greenfield",
    setup: SETUP_FINISHED,
    profile: { name: "Greenfield College", motto: "Knowledge, character, service", address: "Lekki, Lagos", logoUrl: null },
    term: { startsOn: iso(now - 74 * DAY), endsOn: iso(now + 16 * DAY), scoresDueOn: iso(now + 9 * DAY), nextTermBegins: iso(now + 104 * DAY) },
    scale: MOCK_GRADING_SCALE,
    classes,
    arms,
    subjects,
    staff,
    teacherOf,
    students,
    admission,
    sheets,
    unlocks: [
      { id: "unlock-1", armId: "arm-jss3a", subjectId: "subject-agric", reason: "Two continuous assessment scores went into the wrong column.", requestedById: "t-eze", createdAt: new Date(now - 2 * 3_600_000).toISOString(), status: "PENDING" },
      { id: "unlock-2", armId: "arm-ss2b", subjectId: "subject-english", reason: "One student's exam script turned up after I marked the sheet complete.", requestedById: "t-okon", createdAt: new Date(now - DAY).toISOString(), status: "PENDING" },
    ],
    published: {},
    parentSeen: [],
    session: defaultSession({ startsOn: iso(now - 74 * DAY), endsOn: iso(now + 16 * DAY) }),
    closedTerms: [],
  };
}

/** An established school has nothing left to set up. */
const SETUP_FINISHED: SetupState = { firstRunDone: true, checklistHidden: true, gradingChecked: true, termSet: true, imported: true };

/** The defaults every new school is created with (Onboarding Flow §3, step 2). */
export const NEW_SCHOOL_SUBJECTS = [
  "Mathematics", "English Language", "Basic Science", "Basic Technology", "Social Studies",
  "Civic Education", "Computer Studies", "Agricultural Science", "Physical and Health Education",
];
export const NEW_SCHOOL_TERMS = ["First Term", "Second Term", "Third Term"];

/** Sunrise Academy, the day the Brillanda team created it: defaults only, no students, no teachers. */
function seedNewSchool(now = Date.now()): SchoolDb {
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  const classes = ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"].map((name, order) => ({ id: `class-${order + 1}`, name, order }));
  const arms = classes.flatMap((cls) =>
    ["A", "B"].map((letter) => ({ id: `arm-${cls.name.replace(" ", "").toLowerCase()}${letter.toLowerCase()}`, name: `${cls.name}${letter}`, classId: cls.id, formTeacherId: "" })),
  );
  const subjects = NEW_SCHOOL_SUBJECTS.map((name) => ({ id: `subject-${name.toLowerCase().replace(/[^a-z]+/g, "-")}`, name }));
  const sheets: Record<string, Sheet> = {};
  for (const arm of arms) for (const s of subjects) sheets[sheetId(arm.id, s.id)] = { status: "NOT_STARTED", scores: {}, remindedAt: null };
  return {
    id: "sunrise",
    setup: { firstRunDone: false, checklistHidden: false, gradingChecked: false, termSet: false, imported: false },
    profile: { name: "Sunrise Academy", motto: null, address: null, logoUrl: null },
    term: { startsOn: iso(now - 7 * DAY), endsOn: iso(now + 83 * DAY), scoresDueOn: iso(now + 76 * DAY), nextTermBegins: null },
    scale: MOCK_GRADING_SCALE,
    classes,
    arms,
    subjects,
    staff: [{ id: "a-nwankwo", fullName: "Adaobi Nwankwo", email: "admin@sunrise.sample", role: "SCHOOL_ADMIN", status: "ACTIVE" }],
    teacherOf: {},
    students: [],
    admission: { pattern: defaultAdmissionPattern("Sunrise Academy"), digits: 3, next: 1 },
    sheets,
    unlocks: [],
    published: {},
    parentSeen: [],
    session: defaultSession({ startsOn: iso(now - 7 * DAY), endsOn: iso(now + 83 * DAY) }),
    closedTerms: [],
  };
}

/** The next admission number in the school's format; takes it, so call once per student. */
export function takeAdmissionNo(db: SchoolDb): string {
  return formatAdmissionNo(db.admission, sessionStartYear(db), db.admission.next++);
}

/** The first year of the session a school is in: 2026 for 2026/2027. */
export const sessionStartYear = (db?: SchoolDb) => db?.session.startYear ?? SESSION_START_YEAR;

/** A newly enrolled student, active from `joinedOn`. */
export function newStudentRow(fields: Pick<StudentRow, "id" | "fullName" | "admissionNo" | "armId"> & Partial<StudentRow>): StudentRow {
  return {
    parentStatus: "NONE",
    gender: null,
    dob: null,
    guardian: { name: null, phone: null, email: null },
    joinedOn: new Date().toISOString().slice(0, 10),
    status: "ACTIVE",
    left: null,
    ...fields,
  };
}

/** The school a request is for: the new school when its sample account is signed in, else Greenfield. */
export function schoolOf(request?: Request): SchoolKey {
  return request?.headers.get("authorization")?.includes(NEW_SCHOOL_TOKEN_MARK) ? "sunrise" : "greenfield";
}

export function loadSchool(request?: Request): SchoolDb {
  const key = schoolOf(request);
  try {
    const saved = localStorage.getItem(STORAGE_KEYS[key]);
    // Saved before schools had an id or setup state: an established school.
    if (saved) {
      const db = { id: key, setup: SETUP_FINISHED, ...(JSON.parse(saved) as Partial<SchoolDb>) } as SchoolDb;
      db.session ??= defaultSession(db.term);
      db.closedTerms ??= [];
      return db;
    }
  } catch {
    // Unreadable or blocked storage: start again from the seed.
  }
  const fresh = key === "sunrise" ? seedNewSchool() : seed();
  saveSchool(fresh);
  return fresh;
}

export function saveSchool(db: SchoolDb) {
  try {
    localStorage.setItem(STORAGE_KEYS[db.id ?? "greenfield"], JSON.stringify(db));
  } catch {
    // Private browsing: changes last until the tab closes.
  }
}

/** Forgets saved changes; `school` limits it to one school. */
export function resetSchool(school?: SchoolKey) {
  try {
    for (const key of school ? [school] : (Object.keys(STORAGE_KEYS) as SchoolKey[])) localStorage.removeItem(STORAGE_KEYS[key]);
  } catch {
    // Nothing saved.
  }
}
