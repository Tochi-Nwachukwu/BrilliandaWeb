import { delay, http, HttpResponse } from "msw";
import {
  computeSubjectTotal,
  resolveGrade,
  type AddStudentNoteRequest,
  type ReportCard,
  type StudentNote,
  type StudentPhotoResponse,
  type StudentResults,
  type TermResult,
} from "@brillanda/shared-types";
import { armResults, cellsOf, remarksFor, reportCard } from "./adminHandlers";
import { HISTORY } from "./parentHandlers";
import { asClosed, COMPONENTS, loadSchool, rng, SAMPLE_START_YEAR, saveSchool, sheetId, termOf, type SchoolDb, type StudentRow } from "./schoolDb";
import { studentRecord } from "./studentHandlers";

// Stand-ins for a student's own page (DECISIONS.md F-42): results this term and in every term
// before, past report cards, notes and a photo. Past terms are made up from a seed per student, so
// they stay the same on every visit; the two sample children keep the history the parent portal
// shows. Delete with the rest of the stand-ins when the API ships.

const notFound = () => HttpResponse.json({ error: "Not found" }, { status: 404 });
const TERM_NAMES = ["First Term", "Second Term", "Third Term"];
const TERM_IDS = ["first", "second", "third"];
const PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_PHOTO_BYTES = 1024 * 1024;

/** A steady number from a student's id, so made-up history is the same every time. */
function seedOf(id: string) {
  let h = 2166136261;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

function termResult(db: SchoolDb, opts: { year: number; term: number; armName: string; totals: number[]; position: number; of: number; first: string; remark?: string; principal?: string }): TermResult {
  const average = Math.round((opts.totals.reduce((a, b) => a + b, 0) / opts.totals.length) * 100) / 100;
  const remarks = remarksFor(opts.first, average);
  const publishedOn = [`${opts.year}-12-12`, `${opts.year + 1}-04-03`, `${opts.year + 1}-07-24`][opts.term]!;
  return {
    term: { id: `term-${TERM_IDS[opts.term]}-${opts.year}`, name: TERM_NAMES[opts.term]!, sessionName: `${opts.year}/${opts.year + 1}` },
    armName: opts.armName,
    publishedAt: new Date(publishedOn).toISOString(),
    average,
    position: opts.position,
    of: opts.of,
    subjects: db.subjects.map((s, k) => {
      const total = opts.totals[k] ?? opts.totals[0]!;
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
    classTeacherRemark: opts.remark ?? remarks.classTeacherRemark,
    principalRemark: opts.principal ?? remarks.principalRemark,
    seen: true,
  };
}

/** Every term before this one since they joined (or until they left), oldest first. */
export function pastTerms(db: SchoolDb, st: StudentRow): TermResult[] {
  const record = studentRecord(db, st);
  const first = st.fullName.split(" ")[0]!;
  const r = rng(seedOf(st.id));
  const ability = 42 + r() * 46;
  const of = 26 + Math.floor(r() * 9);
  const out: TermResult[] = [];
  const fixed = HISTORY[st.id];

  record.classHistory.forEach(({ sessionName, armName }, yearIndex) => {
    const year = Number(sessionName.slice(0, 4));
    if (year >= SAMPLE_START_YEAR) return;
    const lastSession = year === SAMPLE_START_YEAR - 1;
    for (let term = 0; term < 3; term++) {
      // A student who left part-way through a session has no results after they went.
      if (st.left && new Date(`${[year, year + 1, year + 1][term]}-${["12-12", "04-03", "07-24"][term]}`) > new Date(st.left.on)) continue;
      if (fixed && lastSession) {
        const t = fixed.terms[term]!;
        out.push(termResult(db, { year, term, armName: fixed.arm, totals: t.totals, position: t.position, of: fixed.of, first, remark: t.remark, principal: t.principal }));
        continue;
      }
      const level = ability + yearIndex * 1.4 + term * 0.7 + (r() - 0.5) * 6;
      const totals = db.subjects.map(() => Math.max(18, Math.min(97, Math.round(level + (r() - 0.5) * 24))));
      const average = totals.reduce((a, b) => a + b, 0) / totals.length;
      const position = Math.max(1, Math.min(of, Math.round(of * (1 - (average - 38) / 56))));
      out.push(termResult(db, { year, term, armName, totals, position, of, first }));
    }
  });
  // Terms closed this session, worked out from their sheets as they were.
  for (const ct of db.closedTerms) {
    if (!ct.armOf[st.id]) continue;
    const view = asClosed(db, ct);
    const card = reportCard(view, st.id, ct.term);
    if (!card) continue;
    // A class that wasn't finished when the term closed: average the complete subjects only.
    const unfinished = !armResults(view, ct.armOf[st.id]!).complete;
    const completeTotals = card.subjects.filter((s) => s.scores.every((c) => c.value !== null || c.isAbsent)).map((s) => s.total);
    if (unfinished && !completeTotals.length) continue;
    out.push({
      term: ct.term,
      armName: card.student.armName,
      publishedAt: ct.published[ct.armOf[st.id]!] ?? new Date().toISOString(),
      average: unfinished ? Math.round((completeTotals.reduce((a, b) => a + b, 0) / completeTotals.length) * 100) / 100 : card.average,
      ...(unfinished ? { unfinished } : {}),
      position: unfinished ? 0 : card.position,
      of: card.of,
      subjects: card.subjects.map((s) => ({ ...s, teacherName: null })),
      classTeacherRemark: card.classTeacherRemark,
      principalRemark: card.principalRemark,
      seen: true,
    });
  }
  return out;
}

function currentTerm(db: SchoolDb, st: StudentRow): StudentResults["current"] {
  if (st.status !== "ACTIVE") return null;
  const arm = db.arms.find((a) => a.id === st.armId)!;
  const results = armResults(db, arm.id);
  return {
    term: termOf(db),
    armName: arm.name,
    published: !!db.published[arm.id],
    subjects: db.subjects.map((s) => {
      const sheet = db.sheets[sheetId(arm.id, s.id)]!;
      const entered = sheet.scores[st.id] ?? [null, null, null];
      const anyEntered = entered.some((c) => c !== null);
      const { total, complete } = computeSubjectTotal(COMPONENTS, cellsOf(entered));
      return {
        subjectId: s.id,
        subjectName: s.name,
        status: sheet.status,
        total: anyEntered ? total : null,
        complete,
        grade: complete ? resolveGrade(total, db.scale).grade : null,
      };
    }),
    average: results.complete ? results.averages.get(st.id) ?? null : null,
    position: results.positions.get(st.id) ?? null,
    of: results.of,
  };
}

function pastCard(db: SchoolDb, st: StudentRow, termId: string): ReportCard | null {
  const t = pastTerms(db, st).find((x) => x.term.id === termId);
  if (!t) return null;
  return {
    school: db.profile,
    term: t.term,
    student: { id: st.id, fullName: st.fullName, admissionNo: st.admissionNo, armName: t.armName },
    subjects: t.subjects.map(({ teacherName: _teacher, ...s }) => s),
    average: t.average,
    position: t.position,
    of: t.of,
    classTeacherRemark: t.classTeacherRemark,
    principalRemark: t.principalRemark,
    nextTermBegins: null,
    gradingScale: db.scale,
  };
}

async function dataUrlOf(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:${file.type};base64,${btoa(binary)}`;
}

export const studentRecordHandlers = [
  http.get("/api/v1/admin/students/:id/results", async ({ params, request }) => {
    await delay();
    const db = loadSchool(request);
    const st = db.students.find((s) => s.id === params.id);
    if (!st) return notFound();
    return HttpResponse.json<StudentResults>({ current: currentTerm(db, st), past: pastTerms(db, st) });
  }),

  http.get("/api/v1/admin/students/:id/report-cards/:termId", async ({ params, request }) => {
    await delay();
    const db = loadSchool(request);
    const st = db.students.find((s) => s.id === params.id);
    const card = st && pastCard(db, st, params.termId as string);
    return card ? HttpResponse.json<ReportCard>(card) : notFound();
  }),

  http.post("/api/v1/admin/students/:id/notes", async ({ params, request }) => {
    await delay(300);
    const { text } = (await request.json()) as AddStudentNoteRequest;
    const clean = text?.trim();
    if (!clean) return HttpResponse.json({ error: "Check the highlighted fields.", fields: { text: ["Write the note first."] } }, { status: 400 });
    if (clean.length > 1000) return HttpResponse.json({ error: "Check the highlighted fields.", fields: { text: ["Keep it under 1,000 characters."] } }, { status: 400 });
    const db = loadSchool(request);
    const st = db.students.find((s) => s.id === params.id);
    if (!st) return notFound();
    const author = db.staff.find((s) => s.role === "SCHOOL_ADMIN")?.fullName ?? "School admin";
    const note: StudentNote = { id: `note-${Date.now()}`, text: clean, createdAt: new Date().toISOString(), author };
    (st.notes ??= []).unshift(note);
    saveSchool(db);
    return HttpResponse.json<StudentNote>(note, { status: 201 });
  }),

  http.delete("/api/v1/admin/students/:id/notes/:noteId", async ({ params, request }) => {
    await delay(300);
    const db = loadSchool(request);
    const st = db.students.find((s) => s.id === params.id);
    if (!st || !(st.notes ?? []).some((n) => n.id === params.noteId)) return notFound();
    st.notes = st.notes!.filter((n) => n.id !== params.noteId);
    saveSchool(db);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/v1/admin/students/:id/photo", async ({ params, request }) => {
    await delay(500);
    // Checked by shape: in tests the request's File comes from another realm.
    const file = (await request.formData()).get("photo") as File | string | null;
    const invalid = (message: string) => HttpResponse.json({ error: "Check the highlighted fields.", fields: { photo: [message] } }, { status: 400 });
    if (!file || typeof file === "string" || !file.size) return invalid("Choose a photo.");
    if (!PHOTO_TYPES.includes(file.type)) return invalid("Use a JPG, PNG or WebP photo.");
    if (file.size > MAX_PHOTO_BYTES) return invalid("That photo is over 1 MB. Try a smaller one.");
    const db = loadSchool(request);
    const st = db.students.find((s) => s.id === params.id);
    if (!st) return notFound();
    st.photoUrl = await dataUrlOf(file);
    saveSchool(db);
    return HttpResponse.json<StudentPhotoResponse>({ photoUrl: st.photoUrl });
  }),

  http.delete("/api/v1/admin/students/:id/photo", async ({ params, request }) => {
    await delay(300);
    const db = loadSchool(request);
    const st = db.students.find((s) => s.id === params.id);
    if (!st) return notFound();
    st.photoUrl = null;
    saveSchool(db);
    return HttpResponse.json<StudentPhotoResponse>({ photoUrl: null });
  }),
];

