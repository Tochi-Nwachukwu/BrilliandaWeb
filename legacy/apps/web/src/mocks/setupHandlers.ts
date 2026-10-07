import { delay, http, HttpResponse } from "msw";
import type {
  SaveScoreRequest,
  SaveScoreResponse,
  SchoolLogoResponse,
  SetupStatus,
  TryClassRequest,
  TryClassResponse,
} from "@brillanda/shared-types";
import { adminSheet } from "./adminHandlers";
import { COMPONENTS, loadSchool, NEW_SCHOOL_TERMS, newStudentRow, saveSchool, sheetId, takeAdmissionNo, termOf, type Cell, type SchoolDb } from "./schoolDb";

// Stand-ins for getting a new school set up (packages/shared-types/src/admin.ts, DECISIONS.md F-39),
// and for a school admin saving scores. Delete with the rest of the stand-ins when the API ships.

const invalid = (fields: Record<string, string>) =>
  HttpResponse.json({ error: "Check the highlighted fields.", fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, [v]])) }, { status: 400 });

/** Names added by trying a class get these ids, so trying again replaces them. */
const TRY_PREFIX = "student-try-";
const MAX_TRY_NAMES = 10;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_LOGO_BYTES = 1024 * 1024;

export function setupStatus(db: SchoolDb): SetupStatus {
  return {
    firstRunDone: db.setup.firstRunDone,
    defaults: {
      sessionName: termOf(db).sessionName,
      terms: NEW_SCHOOL_TERMS,
      classes: db.classes.map((c) => c.name),
      arms: [...new Set(db.arms.map((a) => a.name.slice(-1)))],
      subjects: db.subjects.map((s) => s.name),
      components: COMPONENTS,
      gradingScale: db.scale,
    },
    checklist: [
      { id: "IMPORT_STUDENTS", done: db.setup.imported },
      { id: "INVITE_TEACHERS", done: db.staff.some((s) => s.role === "TEACHER") },
      { id: "CHECK_GRADING", done: db.setup.gradingChecked },
      { id: "UPLOAD_LOGO", done: !!db.profile.logoUrl },
      { id: "SET_TERM", done: db.setup.termSet },
    ],
    checklistHidden: db.setup.checklistHidden,
  };
}

/** A school admin's token; teachers' score saves fall through to their own stand-in. */
const isSchoolAdmin = (request: Request) => /school_admin/.test(request.headers.get("authorization") ?? "");

async function dataUrlOf(file: File) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return `data:${file.type};base64,${btoa(binary)}`;
}

export const setupHandlers = [
  http.get("/api/v1/admin/setup", async ({ request }) => {
    await delay();
    return HttpResponse.json<SetupStatus>(setupStatus(loadSchool(request)));
  }),

  http.post("/api/v1/admin/setup/try-class", async ({ request }) => {
    await delay(500);
    const body = (await request.json()) as TryClassRequest;
    const db = loadSchool(request);
    const names = (body.studentNames ?? []).map((n) => n.trim().replace(/\s+/g, " ")).filter(Boolean);
    const errors: Record<string, string> = {};
    if (!db.arms.some((a) => a.id === body.armId)) errors.armId = "Pick a class.";
    if (!db.subjects.some((s) => s.id === body.subjectId)) errors.subjectId = "Pick a subject.";
    if (!names.length) errors.studentNames = "Type at least one name, one per line.";
    else if (names.length > MAX_TRY_NAMES) errors.studentNames = `Up to ${MAX_TRY_NAMES} names here. You'll import your full list next.`;
    else if (names.some((n) => n.length < 2)) errors.studentNames = "Each line needs a full name.";
    if (Object.keys(errors).length) return invalid(errors);

    // Trying again replaces the names from the last try, and their scores.
    const previous = new Set(db.students.filter((s) => s.id.startsWith(TRY_PREFIX)).map((s) => s.id));
    // Their admission numbers are given back when nobody else has been enrolled since.
    if (previous.size && previous.size === db.students.length) db.admission.next -= previous.size;
    db.students = db.students.filter((s) => !previous.has(s.id));
    for (const sheet of Object.values(db.sheets)) for (const id of previous) delete sheet.scores[id];

    const stamp = Date.now();
    names.forEach((fullName, i) => {
      db.students.push(newStudentRow({ id: `${TRY_PREFIX}${stamp}-${i + 1}`, fullName, admissionNo: takeAdmissionNo(db), armId: body.armId }));
    });
    saveSchool(db);
    return HttpResponse.json<TryClassResponse>({ sheet: adminSheet(db, body.armId, body.subjectId)! }, { status: 201 });
  }),

  http.post("/api/v1/admin/setup/first-run", async ({ request }) => {
    await delay();
    const db = loadSchool(request);
    db.setup.firstRunDone = true;
    saveSchool(db);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/v1/admin/setup/checklist/:action", async ({ params, request }) => {
    await delay();
    if (params.action !== "hide" && params.action !== "show") return HttpResponse.json({ error: "Not found" }, { status: 404 });
    const db = loadSchool(request);
    db.setup.checklistHidden = params.action === "hide";
    saveSchool(db);
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/v1/admin/school/logo", async ({ request }) => {
    await delay(500);
    // Checked by shape, not `instanceof File`: in tests the request's File comes from another realm.
    const file = (await request.formData()).get("logo") as File | string | null;
    if (!file || typeof file === "string" || !file.size) return invalid({ logo: "Choose an image file." });
    if (!LOGO_TYPES.includes(file.type)) return invalid({ logo: "Use a PNG, JPG, WebP or SVG image." });
    if (file.size > MAX_LOGO_BYTES) return invalid({ logo: "That image is over 1 MB. Try a smaller one." });
    const db = loadSchool(request);
    db.profile.logoUrl = await dataUrlOf(file);
    saveSchool(db);
    return HttpResponse.json<SchoolLogoResponse>({ logoUrl: db.profile.logoUrl });
  }),

  http.delete("/api/v1/admin/school/logo", async ({ request }) => {
    await delay();
    const db = loadSchool(request);
    db.profile.logoUrl = null;
    saveSchool(db);
    return HttpResponse.json<SchoolLogoResponse>({ logoUrl: null });
  }),

  // A school admin entering scores, as the first run does. Same rules as a teacher's save.
  http.put<{ studentId: string; componentId: string }, SaveScoreRequest>("/api/v1/scores/:studentId/:componentId", async ({ params, request }) => {
    if (!isSchoolAdmin(request)) return undefined;
    await delay();
    const body = await request.json();
    const db = loadSchool(request);
    const student = db.students.find((s) => s.id === params.studentId);
    const index = COMPONENTS.findIndex((c) => c.id === params.componentId);
    const sheet = student && db.sheets[sheetId(student.armId, body.subjectId)];
    if (!student || index < 0 || !sheet || body.termId !== termOf(db).id) return HttpResponse.json({ error: "Not found" }, { status: 404 });
    if (sheet.status === "LOCKED") return HttpResponse.json({ error: "These scores are locked." }, { status: 409 });

    const max = COMPONENTS[index]!.maxScore;
    if (!body.isAbsent && body.value !== null && !(body.value >= 0 && body.value <= max)) {
      return HttpResponse.json({ error: "Validation failed", fields: { value: [`Must be ${max} or less`] } }, { status: 400 });
    }
    const row = (sheet.scores[student.id] ??= [null, null, null]);
    row[index] = body.isAbsent ? "ABS" : (body.value as Cell);
    if (sheet.status === "NOT_STARTED" && row.some((c) => c !== null)) sheet.status = "IN_PROGRESS";
    saveSchool(db);
    const cell = row[index] === null ? null : row[index] === "ABS" ? { value: 0, isAbsent: true } : { value: row[index] as number, isAbsent: false };
    return HttpResponse.json<SaveScoreResponse>({ cell, status: sheet.status });
  }),
];
