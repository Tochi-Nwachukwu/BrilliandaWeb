import { delay, http, HttpResponse } from "msw";
import {
  computeSubjectTotal,
  rankScores,
  resolveGrade,
  type AdminOverview,
  type AdminSheet,
  type AdminStudent,
  type ArmDetail,
  type ArmSummary,
  type CellValue,
  type EntryState,
  type GradingScaleBody,
  type InviteParentRequest,
  type InviteStaffRequest,
  type PendingUnlockRequest,
  type PublishRequest,
  type PublishResponse,
  type PublishState,
  type ReportCard,
  type SchoolProfile,
  type SendRemindersRequest,
  type StaffMember,
  type TermDates,
  type TermRef,
} from "@brillanda/shared-types";
import { COMPONENTS, loadSchool, saveSchool, sheetId, termOf, type Cell, type SchoolDb } from "./schoolDb";

// Stand-ins for the endpoints in packages/shared-types/src/admin.ts (DECISIONS.md F-37). Totals,
// grades and positions come from the shared grading code, exactly as the API will compute them.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const notFound = () => HttpResponse.json({ error: "Not found" }, { status: 404 });
const invalid = (fields: Record<string, string>) =>
  HttpResponse.json({ error: "Check the highlighted fields.", fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, [v]])) }, { status: 400 });

export const isDone = (status: EntryState) => status === "COMPLETE" || status === "LOCKED";
const toCell = (cell: Cell): CellValue | null => (cell === null ? null : cell === "ABS" ? { value: 0, isAbsent: true } : { value: cell, isAbsent: false });
export const cellsOf = (row: [Cell, Cell, Cell]) => Object.fromEntries(COMPONENTS.map((c, i) => [c.id, toCell(row[i]!)]));
const person = (db: SchoolDb, id: string | undefined) => {
  const found = db.staff.find((s) => s.id === id);
  return found ? { id: found.id, fullName: found.fullName } : null;
};
const classOf = (db: SchoolDb, armId: string) => db.classes.find((c) => c.id === db.arms.find((a) => a.id === armId)?.classId)!;
/** Students currently in the arm; those who have left keep their record but drop off class lists. */
const studentsIn = (db: SchoolDb, armId: string) => db.students.filter((s) => s.armId === armId && s.status === "ACTIVE");
const activeStudents = (db: SchoolDb) => db.students.filter((s) => s.status === "ACTIVE");

function sheetProgress(db: SchoolDb, armId: string, subjectId: string) {
  const sheet = db.sheets[sheetId(armId, subjectId)]!;
  const list = studentsIn(db, armId);
  const complete = list.filter((s) => computeSubjectTotal(COMPONENTS, cellsOf(sheet.scores[s.id] ?? [null, null, null])).complete).length;
  return { sheet, complete, total: list.length };
}

function publishStateOf(db: SchoolDb, armId: string): PublishState {
  if (db.published[armId]) return "PUBLISHED";
  const statuses = db.subjects.map((s) => db.sheets[sheetId(armId, s.id)]!.status);
  if (statuses.every(isDone)) return "COMPLETE";
  return statuses.some((s) => s !== "NOT_STARTED") ? "IN_PROGRESS" : "NOT_STARTED";
}

function armSummary(db: SchoolDb, armId: string): ArmSummary {
  const arm = db.arms.find((a) => a.id === armId)!;
  const cls = classOf(db, armId);
  return {
    id: arm.id,
    name: arm.name,
    className: cls.name,
    classOrder: cls.order,
    studentCount: studentsIn(db, arm.id).length,
    formTeacher: person(db, arm.formTeacherId),
    subjects: db.subjects.map((s) => ({ subjectId: s.id, subjectName: s.name, status: db.sheets[sheetId(arm.id, s.id)]!.status })),
    publishStatus: publishStateOf(db, arm.id),
    pendingUnlockRequests: db.unlocks.filter((u) => u.armId === arm.id && u.status === "PENDING").length,
  };
}

/** Each student's subject totals, and (once every subject is in) average and position. */
export function armResults(db: SchoolDb, armId: string) {
  const list = studentsIn(db, armId);
  const totals = new Map(
    list.map((st) => [st.id, db.subjects.map((s) => computeSubjectTotal(COMPONENTS, cellsOf(db.sheets[sheetId(armId, s.id)]!.scores[st.id] ?? [null, null, null])).total)]),
  );
  const complete = db.subjects.every((s) => isDone(db.sheets[sheetId(armId, s.id)]!.status));
  const averages = new Map(list.map((st) => [st.id, Math.round((totals.get(st.id)!.reduce((a, b) => a + b, 0) / db.subjects.length) * 100) / 100]));
  const positions = complete ? rankScores(list.map((st) => ({ id: st.id, total: averages.get(st.id)! }))) : new Map<string, number>();
  return { totals, averages, positions, complete, of: list.length };
}

/** Sample remarks that fit the result; the real ones are typed by teachers and the principal. */
export function remarksFor(first: string, average: number) {
  if (average >= 70) return { classTeacherRemark: `${first} has done excellent work this term.`, principalRemark: "An excellent term. Keep it up." };
  if (average >= 55) return { classTeacherRemark: `${first} has worked steadily this term.`, principalRemark: "A good term. Keep working hard." };
  return { classTeacherRemark: `${first} needs more support, especially in the weaker subjects.`, principalRemark: "Let us work together at home and in school to improve next term." };
}

/** A student's report card for the current term, or for `term` when `db` is a closed term (asClosed). */
export function reportCard(db: SchoolDb, studentId: string, term: TermRef = termOf(db)): ReportCard | null {
  const student = db.students.find((s) => s.id === studentId);
  if (!student) return null;
  const arm = db.arms.find((a) => a.id === student.armId)!;
  const results = armResults(db, arm.id);
  return {
    school: db.profile,
    term,
    student: { id: student.id, fullName: student.fullName, admissionNo: student.admissionNo, armName: arm.name },
    subjects: db.subjects.map((s, i) => {
      const row = db.sheets[sheetId(arm.id, s.id)]!.scores[student.id] ?? [null, null, null];
      const total = results.totals.get(student.id)![i]!;
      const band = resolveGrade(total, db.scale);
      return {
        subjectName: s.name,
        scores: COMPONENTS.map((c, k) => ({ component: c.name, maxScore: c.maxScore, value: typeof row[k] === "number" ? (row[k] as number) : null, isAbsent: row[k] === "ABS" })),
        total,
        grade: band.grade,
        remark: band.remark,
      };
    }),
    average: results.averages.get(student.id)!,
    position: results.positions.get(student.id) ?? 0,
    of: results.of,
    ...remarksFor(student.fullName.split(" ")[0]!, results.averages.get(student.id)!),
    nextTermBegins: db.term.nextTermBegins,
    gradingScale: db.scale,
  };
}

/** One subject in one arm, as a score sheet. */
export function adminSheet(db: SchoolDb, armId: string, subjectId: string): AdminSheet | null {
  const sheet = db.sheets[sheetId(armId, subjectId)];
  const arm = db.arms.find((a) => a.id === armId);
  const subject = db.subjects.find((s) => s.id === subjectId);
  if (!sheet || !arm || !subject) return null;
  return {
    arm: { id: arm.id, name: arm.name, className: classOf(db, arm.id).name },
    subject,
    term: termOf(db),
    status: sheet.status,
    components: COMPONENTS,
    gradingScale: db.scale,
    rows: studentsIn(db, armId).map((st) => ({
      studentId: st.id,
      admissionNo: st.admissionNo,
      fullName: st.fullName,
      scores: Object.fromEntries(Object.entries(cellsOf(sheet.scores[st.id] ?? [null, null, null])).filter(([, v]) => v)) as Record<string, CellValue>,
    })),
  };
}

export const adminHandlers = [
  http.get("/api/v1/admin/overview", async ({ request }) => {
    await delay();
    const db = loadSchool(request);
    const statuses = Object.values(db.sheets).map((s) => s.status);
    const complete = statuses.filter(isDone).length;
    const behind = new Map<string, number>();
    for (const arm of db.arms) for (const s of db.subjects) {
      const p = sheetProgress(db, arm.id, s.id);
      if (!isDone(p.sheet.status) && p.complete / Math.max(1, p.total) < 0.5) {
        const t = db.teacherOf[sheetId(arm.id, s.id)];
        if (t) behind.set(t, (behind.get(t) ?? 0) + 1);
      }
    }
    const started = new Date(db.term.startsOn).getTime();
    const weekNumber = Math.max(1, Math.min(13, Math.floor((Date.now() - started) / (7 * 86_400_000)) + 1));
    const curve = [0, 0, 0.03, 0.07, 0.13, 0.2, 0.32, 0.48, 0.68, 0.88, 1, 1, 1];
    return HttpResponse.json<AdminOverview>({
      term: termOf(db),
      week: { number: weekNumber, of: 13 },
      scoresDueAt: db.term.scoresDueOn,
      sheets: { total: statuses.length, complete, inProgress: statuses.filter((s) => s === "IN_PROGRESS").length, notStarted: statuses.filter((s) => s === "NOT_STARTED").length },
      completeByWeek: curve.slice(0, weekNumber).map((f, i) => (i === weekNumber - 1 ? complete : Math.round(f * complete))),
      armsReadyToPublish: db.arms.filter((a) => publishStateOf(db, a.id) === "COMPLETE").length,
      armsPublished: Object.keys(db.published).length,
      pendingUnlockRequests: db.unlocks.filter((u) => u.status === "PENDING").length,
      students: activeStudents(db).length,
      studentsWithoutParent: activeStudents(db).filter((s) => s.parentStatus !== "LINKED").length,
      teachersBehind: [...behind].sort((a, b) => b[1] - a[1]).map(([id, sheets]) => ({ teacher: person(db, id)!, sheets })),
    });
  }),

  http.get("/api/v1/admin/arms", async ({ request }) => {
    await delay();
    const db = loadSchool(request);
    return HttpResponse.json<ArmSummary[]>(db.arms.map((a) => armSummary(db, a.id)));
  }),

  http.get("/api/v1/admin/arms/:armId", async ({ params, request }) => {
    await delay();
    const db = loadSchool(request);
    if (!db.arms.some((a) => a.id === params.armId)) return notFound();
    const armId = params.armId as string;
    const results = armResults(db, armId);
    return HttpResponse.json<ArmDetail>({
      ...armSummary(db, armId),
      sheets: db.subjects.map((s) => {
        const p = sheetProgress(db, armId, s.id);
        const unlock = db.unlocks.find((u) => u.armId === armId && u.subjectId === s.id && u.status === "PENDING");
        return {
          subjectId: s.id,
          subjectName: s.name,
          teacher: person(db, db.teacherOf[sheetId(armId, s.id)]),
          status: p.sheet.status,
          studentsComplete: p.complete,
          unlockRequest: unlock ? { id: unlock.id, reason: unlock.reason, requestedBy: person(db, unlock.requestedById)!, createdAt: unlock.createdAt } : null,
          remindedAt: p.sheet.remindedAt,
        };
      }),
      students: studentsIn(db, armId).map((st) => ({
        id: st.id,
        fullName: st.fullName,
        admissionNo: st.admissionNo,
        parentStatus: st.parentStatus,
        average: results.complete ? results.averages.get(st.id)! : null,
        position: results.positions.get(st.id) ?? null,
      })),
    });
  }),

  http.get("/api/v1/admin/sheets", async ({ request }) => {
    await delay();
    const url = new URL(request.url);
    const armId = url.searchParams.get("armId") ?? "";
    const subjectId = url.searchParams.get("subjectId") ?? "";
    const sheet = adminSheet(loadSchool(request), armId, subjectId);
    return sheet ? HttpResponse.json<AdminSheet>(sheet) : notFound();
  }),

  http.get("/api/v1/admin/unlock-requests", async ({ request }) => {
    await delay();
    const db = loadSchool(request);
    const pending = db.unlocks
      .filter((u) => u.status === "PENDING")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map<PendingUnlockRequest>((u) => ({
        id: u.id,
        reason: u.reason,
        requestedBy: person(db, u.requestedById)!,
        createdAt: u.createdAt,
        armId: u.armId,
        armName: db.arms.find((a) => a.id === u.armId)!.name,
        subjectId: u.subjectId,
        subjectName: db.subjects.find((s) => s.id === u.subjectId)!.name,
      }));
    return HttpResponse.json(pending);
  }),

  http.post("/api/v1/admin/unlock-requests/:id/:decision", async ({ params, request }) => {
    await delay();
    const db = loadSchool(request);
    const unlock = db.unlocks.find((u) => u.id === params.id);
    if (!unlock || !["approve", "decline"].includes(params.decision as string)) return notFound();
    if (unlock.status !== "PENDING") return HttpResponse.json({ error: "This request has already been dealt with." }, { status: 409 });
    unlock.status = params.decision === "approve" ? "APPROVED" : "REJECTED";
    if (unlock.status === "APPROVED") db.sheets[sheetId(unlock.armId, unlock.subjectId)]!.status = "IN_PROGRESS";
    saveSchool(db);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/v1/admin/reminders", async ({ request }) => {
    await delay();
    const { teacherIds } = (await request.json()) as SendRemindersRequest;
    const db = loadSchool(request);
    const now = new Date().toISOString();
    for (const [key, teacher] of Object.entries(db.teacherOf)) {
      if (teacherIds.includes(teacher) && !isDone(db.sheets[key]!.status)) db.sheets[key]!.remindedAt = now;
    }
    saveSchool(db);
    return HttpResponse.json({ sent: teacherIds.length });
  }),

  http.post("/api/v1/admin/publish", async ({ request }) => {
    await delay(700);
    const { armIds } = (await request.json()) as PublishRequest;
    const db = loadSchool(request);
    const notReady = armIds.filter((id) => publishStateOf(db, id) !== "COMPLETE");
    if (notReady.length) return HttpResponse.json({ error: "Some of these classes still have subjects to finish." }, { status: 409 });
    const now = new Date().toISOString();
    let parentsEmailed = 0;
    let printedSlips = 0;
    for (const id of armIds) {
      db.published[id] = now;
      for (const s of db.subjects) db.sheets[sheetId(id, s.id)]!.status = "LOCKED";
      for (const st of studentsIn(db, id)) st.parentStatus === "LINKED" ? parentsEmailed++ : printedSlips++;
    }
    saveSchool(db);
    return HttpResponse.json<PublishResponse>({ published: armIds, parentsEmailed, printedSlips });
  }),

  http.get("/api/v1/admin/report-cards/:studentId", async ({ params, request }) => {
    await delay();
    const card = reportCard(loadSchool(request), params.studentId as string);
    return card ? HttpResponse.json<ReportCard>(card) : notFound();
  }),

  http.get("/api/v1/admin/students", async ({ request }) => {
    await delay();
    const db = loadSchool(request);
    return HttpResponse.json<AdminStudent[]>(
      db.students.map((st) => {
        const arm = db.arms.find((a) => a.id === st.armId)!;
        return { id: st.id, fullName: st.fullName, admissionNo: st.admissionNo, armId: arm.id, armName: arm.name, classOrder: classOf(db, arm.id).order, parentStatus: st.parentStatus, gender: st.gender, status: st.status };
      }),
    );
  }),

  http.post("/api/v1/admin/students/:id/invite-parent", async ({ params, request }) => {
    await delay();
    const body = (await request.json()) as InviteParentRequest;
    if (!EMAIL.test(body.email?.trim() ?? "")) return invalid({ email: "Check this email address. It should look like name@example.com." });
    const db = loadSchool(request);
    const student = db.students.find((s) => s.id === params.id);
    if (!student) return notFound();
    student.parentStatus = "INVITED";
    (student.events ??= []).unshift({ at: new Date().toISOString(), kind: "PARENT_INVITED", text: `Parent invited: ${body.email.trim()}` });
    saveSchool(db);
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/v1/admin/staff", async ({ request }) => {
    await delay();
    const db = loadSchool(request);
    return HttpResponse.json<StaffMember[]>(
      db.staff.map((member) => {
        const mine = Object.entries(db.teacherOf).filter(([, t]) => t === member.id).map(([key]) => key);
        return {
          ...member,
          subjects: [...new Set(mine.map((key) => db.subjects.find((s) => s.id === key.split(":")[1])!.name))],
          sheetsTotal: mine.length,
          sheetsComplete: mine.filter((key) => isDone(db.sheets[key]!.status)).length,
        };
      }),
    );
  }),

  // The real endpoint exists (F-26); this stand-in lets the page work without the API running.
  http.post("/api/v1/users/invite", async ({ request }) => {
    await delay();
    const body = (await request.json()) as InviteStaffRequest;
    const errors: Record<string, string> = {};
    if ((body.fullName?.trim().length ?? 0) < 2) errors.fullName = "Enter the person's full name";
    if (!EMAIL.test(body.email?.trim() ?? "")) errors.email = "Check this email address. It should look like name@greenfield.sch.ng.";
    if (Object.keys(errors).length) return invalid(errors);
    const db = loadSchool(request);
    const email = body.email.trim().toLowerCase();
    const existing = db.staff.find((s) => s.email === email);
    if (existing && existing.status === "ACTIVE") return invalid({ email: "Someone with this email is already on your staff." });
    if (!existing) db.staff.push({ id: `staff-${Date.now()}`, fullName: body.fullName.trim(), email, role: body.role, status: "INVITED" });
    saveSchool(db);
    return HttpResponse.json({ resent: !!existing }, { status: existing ? 200 : 201 });
  }),

  http.get("/api/v1/admin/school", async ({ request }) => {
    await delay();
    return HttpResponse.json<SchoolProfile>(loadSchool(request).profile);
  }),
  http.put("/api/v1/admin/school", async ({ request }) => {
    await delay();
    const body = (await request.json()) as SchoolProfile;
    if (!body.name?.trim()) return invalid({ name: "Enter the school's name." });
    const db = loadSchool(request);
    db.profile = { ...db.profile, name: body.name.trim(), motto: body.motto?.trim() || null, address: body.address?.trim() || null };
    saveSchool(db);
    return HttpResponse.json<SchoolProfile>(db.profile);
  }),

  http.get("/api/v1/admin/term", async ({ request }) => {
    await delay();
    return HttpResponse.json<TermDates>(loadSchool(request).term);
  }),
  http.put("/api/v1/admin/term", async ({ request }) => {
    await delay();
    const body = (await request.json()) as TermDates;
    if (body.endsOn <= body.startsOn) return invalid({ endsOn: "The term has to end after it starts." });
    if (body.scoresDueOn < body.startsOn || body.scoresDueOn > body.endsOn) return invalid({ scoresDueOn: "Pick a day inside the term." });
    const db = loadSchool(request);
    db.term = body;
    db.setup.termSet = true;
    saveSchool(db);
    return HttpResponse.json<TermDates>(db.term);
  }),

  http.get("/api/v1/admin/grading-scale", async ({ request }) => {
    await delay();
    return HttpResponse.json<GradingScaleBody>({ bands: loadSchool(request).scale });
  }),
  http.put("/api/v1/admin/grading-scale", async ({ request }) => {
    await delay();
    const { bands } = (await request.json()) as GradingScaleBody;
    if (!bands.some((b) => b.minScore === 0)) return HttpResponse.json({ error: "Add a grade that starts at 0, so every total gets a grade." }, { status: 400 });
    const db = loadSchool(request);
    db.scale = [...bands].sort((a, b) => b.minScore - a.minScore);
    db.setup.gradingChecked = true;
    saveSchool(db);
    return HttpResponse.json<GradingScaleBody>({ bands: db.scale });
  }),
];
