import { delay, http, HttpResponse } from "msw";
import { resolveGrade, type ChildResults, type ChildSummary, type ReportCard, type SchoolNotice, type TermResult } from "@brillanda/shared-types";
import { reportCard } from "./adminHandlers";
import { asClosed, COMPONENTS, loadSchool, SAMPLE_CHILDREN, saveSchool, sheetId, termOf, type SchoolDb } from "./schoolDb";

// Stand-ins for the endpoints in packages/shared-types/src/parent.ts (DECISIONS.md F-38). Last
// session's three terms are fixed history; this term comes from the sample school, so it appears
// the moment the school admin publishes the child's class.

const DAY = 86_400_000;
const notFound = () => HttpResponse.json({ error: "Not found" }, { status: 404 });

/** Last session, per child: the class they were in, class size, and each term's position and totals. */
export const HISTORY: Record<string, { arm: string; of: number; terms: { id: string; name: string; position: number; totals: number[]; remark: string; principal: string }[] }> = {
  "student-chiamaka": {
    arm: "JSS 1B",
    of: 32,
    terms: [
      { id: "term-first-2025", name: "First Term", position: 7, totals: [72, 66, 81, 60, 70, 71, 76, 49, 57], remark: "A promising start. Chiamaka listens well.", principal: "A good first term." },
      { id: "term-second-2025", name: "Second Term", position: 5, totals: [78, 70, 85, 64, 73, 74, 78, 54, 58], remark: "Chiamaka is growing in confidence.", principal: "Steady progress. Well done." },
      { id: "term-third-2025", name: "Third Term", position: 4, totals: [82, 74, 88, 69, 71, 77, 80, 58, 65], remark: "Chiamaka is careful and asks good questions. French needs steady practice over the holiday.", principal: "A very good term. Keep it up." },
    ],
  },
  "student-obinna": {
    arm: "SS 2A",
    of: 29,
    terms: [
      { id: "term-first-2025", name: "First Term", position: 13, totals: [55, 63, 74, 70, 66, 58, 69, 44, 52], remark: "Obinna needs to hand work in on time.", principal: "You can do better. Keep going." },
      { id: "term-second-2025", name: "Second Term", position: 12, totals: [57, 64, 77, 71, 67, 60, 70, 46, 55], remark: "Better effort this term.", principal: "Improving. Keep at it." },
      { id: "term-third-2025", name: "Third Term", position: 11, totals: [58, 66, 79, 72, 68, 61, 70, 47, 56], remark: "Obinna has grown in confidence this year. Mathematics will come with more practice at home.", principal: "Steady progress. Final year now: focus." },
    ],
  },
};
const LAST_SESSION = "2025/2026";

function historyTerms(db: SchoolDb, childId: string): TermResult[] {
  const h = HISTORY[childId]!;
  return h.terms.map((t, i) => ({
    term: { id: t.id, name: t.name, sessionName: LAST_SESSION },
    armName: h.arm,
    publishedAt: new Date(Date.now() - (300 - i * 110) * DAY).toISOString(),
    average: Math.round((t.totals.reduce((a, b) => a + b, 0) / t.totals.length) * 100) / 100,
    position: t.position,
    of: h.of,
    subjects: db.subjects.map((s, k) => {
      const total = t.totals[k]!;
      const ca1 = Math.round(total * 0.19), ca2 = Math.round(total * 0.2);
      const band = resolveGrade(total, db.scale);
      return {
        subjectName: s.name,
        teacherName: null,
        scores: COMPONENTS.map((c, n) => ({ component: c.name, maxScore: c.maxScore, value: [ca1, ca2, total - ca1 - ca2][n]!, isAbsent: false })),
        total,
        grade: band.grade,
        remark: band.remark,
      };
    }),
    classTeacherRemark: t.remark,
    principalRemark: t.principal,
    seen: true,
  }));
}

/** This term once the school has published the child's class, or a closed term when `db` is one (asClosed). */
function currentTerm(db: SchoolDb, childId: string, term = termOf(db)): TermResult | null {
  const student = db.students.find((s) => s.id === childId)!;
  const publishedAt = db.published[student.armId];
  if (!publishedAt) return null;
  const card = reportCard(db, childId, term)!;
  return {
    term,
    armName: card.student.armName,
    publishedAt,
    average: card.average,
    position: card.position,
    of: card.of,
    subjects: card.subjects.map((s, k) => ({
      ...s,
      teacherName: db.staff.find((t) => t.id === db.teacherOf[sheetId(student.armId, db.subjects[k]!.id)])?.fullName ?? null,
    })),
    classTeacherRemark: card.classTeacherRemark,
    principalRemark: card.principalRemark,
    seen: db.parentSeen.includes(`${childId}:${term.id}`),
  };
}

function results(db: SchoolDb, childId: string): ChildResults {
  const child = SAMPLE_CHILDREN.find((c) => c.id === childId)!;
  const now = currentTerm(db, childId);
  // Terms closed this session, where the child's class was published before closing.
  const closed = db.closedTerms.flatMap((ct) => (ct.armOf[childId] ? [currentTerm(asClosed(db, ct), childId, ct.term)] : [])).filter((t): t is TermResult => !!t);
  const terms = [...historyTerms(db, childId), ...closed, ...(now ? [now] : [])];
  const last = terms[terms.length - 1]!;
  // Their arm now: it changes when they're promoted.
  const arm = db.arms.find((a) => a.id === (db.students.find((s) => s.id === childId)?.armId ?? child.armId))!;
  return {
    child: {
      id: child.id,
      fullName: child.fullName,
      armName: arm.name,
      classOrder: db.classes.find((c) => c.id === arm.classId)!.order,
      schoolName: db.profile.name,
      latest: { termId: last.term.id, label: `${last.term.name}, ${last.term.sessionName}`, average: last.average, position: last.position, of: last.of, seen: last.seen },
    },
    terms,
    currentTerm: now ? null : { term: termOf(db), published: false },
  };
}

function cardFor(db: SchoolDb, childId: string, termId: string): ReportCard | null {
  const r = results(db, childId);
  const t = r.terms.find((x) => x.term.id === termId);
  if (!t) return null;
  const student = db.students.find((s) => s.id === childId)!;
  return {
    school: db.profile,
    term: t.term,
    student: { id: student.id, fullName: student.fullName, admissionNo: student.admissionNo, armName: t.armName },
    subjects: t.subjects.map(({ teacherName: _teacher, ...s }) => s),
    average: t.average,
    position: t.position,
    of: t.of,
    classTeacherRemark: t.classTeacherRemark,
    principalRemark: t.principalRemark,
    nextTermBegins: db.term.nextTermBegins,
    gradingScale: db.scale,
  };
}

const isChild = (id: unknown) => SAMPLE_CHILDREN.some((c) => c.id === id);

export const parentHandlers = [
  http.get("/api/v1/parent/children", async () => {
    await delay();
    const db = loadSchool();
    return HttpResponse.json<ChildSummary[]>(SAMPLE_CHILDREN.map((c) => results(db, c.id).child));
  }),

  http.get("/api/v1/parent/children/:id/results", async ({ params }) => {
    await delay();
    if (!isChild(params.id)) return notFound();
    return HttpResponse.json<ChildResults>(results(loadSchool(), params.id as string));
  }),

  http.get("/api/v1/parent/children/:id/report-cards/:termId", async ({ params }) => {
    await delay();
    if (!isChild(params.id)) return notFound();
    const card = cardFor(loadSchool(), params.id as string, params.termId as string);
    return card ? HttpResponse.json<ReportCard>(card) : notFound();
  }),

  http.post("/api/v1/parent/children/:id/terms/:termId/seen", async ({ params }) => {
    await delay(100);
    if (!isChild(params.id)) return notFound();
    const db = loadSchool();
    const key = `${params.id}:${params.termId}`;
    if (!db.parentSeen.includes(key)) db.parentSeen.push(key);
    saveSchool(db);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/v1/parent/notices", async () => {
    await delay();
    const db = loadSchool();
    const due = new Date(db.term.scoresDueOn);
    return HttpResponse.json<SchoolNotice[]>([
      { id: "notice-evening", title: "Parents' evening", body: `Thursday, 4 pm. Meet your child's teachers at ${db.profile.name}.`, at: new Date(Date.now() - 2 * DAY).toISOString() },
      { id: "notice-exams", title: "First term exams", body: `Exams run until ${due.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}. Results follow soon after.`, at: new Date(Date.now() - 5 * DAY).toISOString() },
    ]);
  }),
];
