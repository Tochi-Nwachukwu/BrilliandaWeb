import { delay, http, HttpResponse } from "msw";
import {
  admissionPatternProblems,
  classKey,
  formatAdmissionNo,
  MAX_IMPORT_ROWS,
  readDate,
  readGender,
  sameAdmissionNo,
  type AdmissionNumberSettings,
  type EnrolStudentRequest,
  type EnrolStudentResponse,
  type ImportRowResult,
  type ImportStudentsRequest,
  type ImportStudentsResponse,
  type StudentEvent,
  type LeaveSchoolRequest,
  type StudentRecord,
  type UpdateStudentRequest,
} from "@brillanda/shared-types";
import { loadSchool, newStudentRow, saveSchool, sessionNameOf, sessionStartYear, sheetId, takeAdmissionNo, type SchoolDb, type StudentRow } from "./schoolDb";

// Stand-ins for enrolment (packages/shared-types/src/admin.ts, DECISIONS.md F-40): enrolling one
// student, correcting their details, moving class, leaving and readmitting, and the school's
// admission number format. Delete with the rest of the stand-ins when the API ships.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const LEFT = ["WITHDRAWN", "TRANSFERRED", "GRADUATED"];
const notFound = () => HttpResponse.json({ error: "Not found" }, { status: 404 });
const invalid = (fields: Record<string, string>) =>
  HttpResponse.json({ error: "Check the highlighted fields.", fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, [v]])) }, { status: 400 });
const today = () => new Date().toISOString().slice(0, 10);
const tidy = (value: string | null | undefined) => value?.trim().replace(/\s+/g, " ") || null;

/** Their class in each session from the year they joined, assuming they moved up a level each year. */
function classHistoryOf(db: SchoolDb, st: StudentRow, order: number, armName: string) {
  if (st.pastClasses?.length) {
    const now = sessionNameOf(db);
    return st.status === "ACTIVE" && st.pastClasses.at(-1)!.sessionName !== now ? [...st.pastClasses, { sessionName: now, armName }] : st.pastClasses;
  }
  const start = sessionStartYear(db);
  const lastYear = st.left ? Math.min(start, Number(st.left.on.slice(0, 4)) - (Number(st.left.on.slice(5, 7)) < 9 ? 1 : 0)) : start;
  const letter = armName.slice(-1);
  const history: { sessionName: string; armName: string }[] = [];
  for (let year = Number(st.joinedOn.slice(0, 4)) - (Number(st.joinedOn.slice(5, 7)) < 9 ? 1 : 0); year <= lastYear; year++) {
    const cls = db.classes.find((c) => c.order === order - (lastYear - year));
    if (cls) history.push({ sessionName: `${year}/${year + 1}`, armName: year === lastYear ? armName : `${cls.name}${letter}` });
  }
  return history;
}

export function studentRecord(db: SchoolDb, st: StudentRow): StudentRecord {
  const arm = db.arms.find((a) => a.id === st.armId)!;
  const cls = db.classes.find((c) => c.id === arm.classId)!;
  const history = classHistoryOf(db, st, cls.order, arm.name);
  // Seeded students have no stored events; their first one is joining.
  const joined = { at: st.joinedOn, kind: "ENROLLED" as const, text: `Joined ${history[0]?.armName ?? arm.name} as ${st.admissionNo}` };
  const events = st.events ?? [];
  return {
    id: st.id,
    fullName: st.fullName,
    admissionNo: st.admissionNo,
    armId: arm.id,
    armName: arm.name,
    classOrder: cls.order,
    parentStatus: st.parentStatus,
    gender: st.gender,
    status: st.status,
    dob: st.dob,
    guardian: st.guardian,
    joinedOn: st.joinedOn,
    left: st.left,
    photoUrl: st.photoUrl ?? null,
    classHistory: history,
    events: events.some((e) => e.kind === "ENROLLED") ? events : [...events, joined],
    notes: st.notes ?? [],
  };
}

const event = (st: StudentRow, kind: StudentEvent["kind"], text: string) => (st.events ??= []).unshift({ at: new Date().toISOString(), kind, text });

/** Field problems shared by enrolling and editing. `self` is the student being edited. */
function problemsOf(db: SchoolDb, body: EnrolStudentRequest | UpdateStudentRequest, self?: StudentRow) {
  const errors: Record<string, string> = {};
  const name = tidy(body.fullName) ?? "";
  if (name.length < 2) errors.fullName = "Enter the student's full name.";
  else if (!name.includes(" ")) errors.fullName = "Add their surname too.";
  if (!db.arms.some((a) => a.id === body.armId)) errors.armId = "Pick a class.";
  if (body.gender && body.gender !== "MALE" && body.gender !== "FEMALE") errors.gender = "Pick male or female, or leave it blank.";
  if (body.dob) {
    const age = sessionStartYear(db) - Number(body.dob.slice(0, 4));
    if (!DATE.test(body.dob) || Number.isNaN(Date.parse(body.dob))) errors.dob = "Check the date of birth.";
    else if (age < 5 || age > 25) errors.dob = "That makes them " + age + " years old. Check the year.";
  }
  if (!body.joinedOn || !DATE.test(body.joinedOn)) errors.joinedOn = "Enter the day they joined.";
  else if (body.joinedOn > today()) errors.joinedOn = "That's in the future. Use the day they start.";
  const admissionNo = tidy(body.admissionNo);
  if (admissionNo) {
    const taken = db.students.find((s) => s !== self && sameAdmissionNo(s.admissionNo, admissionNo));
    if (taken) errors.admissionNo = `${taken.fullName} already has this number.`;
  } else if (self) errors.admissionNo = "Every student needs an admission number.";
  const email = tidy(body.guardian?.email);
  if (email && !EMAIL.test(email)) errors["guardian.email"] = "Check this email address. It should look like name@example.com.";
  const phone = tidy(body.guardian?.phone);
  if (phone && !/^\+?[\d\s-]{7,16}$/.test(phone)) errors["guardian.phone"] = "Check the phone number.";
  if ("inviteParent" in body && body.inviteParent && !email) errors["guardian.email"] = "Add an email to send the invite to.";
  return errors;
}

const guardianOf = (body: EnrolStudentRequest | UpdateStudentRequest) => ({
  name: tidy(body.guardian?.name),
  phone: tidy(body.guardian?.phone),
  email: tidy(body.guardian?.email)?.toLowerCase() ?? null,
});

/** Moves a student's scores this term from one arm's sheets to another's. */
function moveScores(db: SchoolDb, studentId: string, from: string, to: string) {
  for (const subject of db.subjects) {
    const old = db.sheets[sheetId(from, subject.id)];
    const next = db.sheets[sheetId(to, subject.id)];
    if (!old || !next) continue;
    if (old.scores[studentId]) next.scores[studentId] = old.scores[studentId]!;
    delete old.scores[studentId];
  }
}

/** Checks one imported row against the school and the rows before it, or enrols it. */
function checkImport(db: SchoolDb, body: ImportStudentsRequest): ImportStudentsResponse {
  const armsByKey = new Map(db.arms.map((a) => [classKey(a.name), a]));
  const classesByKey = new Map(db.classes.map((c) => [classKey(c.name), c]));
  const armNames = db.arms.map((a) => a.name);
  const seenNumbers = new Map<string, number>();
  const seenPeople = new Map<string, number>();
  let next = db.admission.next;
  let enrolled = 0;
  let parentsInvited = 0;
  const stamp = Date.now();

  const results = body.rows.map((row, index): ImportRowResult => {
    const problems: ImportRowResult["problems"] = {};
    const fullName = tidy(row.fullName) ?? "";
    if (fullName.length < 2) problems.fullName = "No name.";
    else if (!fullName.includes(" ")) problems.fullName = "Add their surname too.";

    const written = tidy(row.className) ?? "";
    const arm = armsByKey.get(classKey(written));
    if (!written) problems.className = "No class.";
    else if (!arm) {
      const cls = classesByKey.get(classKey(written));
      const arms = cls ? db.arms.filter((a) => a.classId === cls.id).map((a) => a.name) : [];
      problems.className = cls ? `Which arm? ${arms.join(" or ")}.` : `No class called “${written}”. Classes run from ${armNames[0]} to ${armNames.at(-1)}.`;
    }

    const gender = readGender(row.gender ?? "");
    if (gender === undefined) problems.gender = `“${row.gender.trim()}” isn't a gender. Use M or F.`;
    const dob = readDate(row.dob ?? "");
    if (dob === undefined) problems.dob = `Can't read “${row.dob.trim()}”. Write it day first, e.g. 14/03/2014.`;
    else if (dob) {
      const age = sessionStartYear(db) - Number(dob.slice(0, 4));
      if (age < 5 || age > 25) problems.dob = `That makes them ${age}. Check the year.`;
    }
    const email = tidy(row.guardianEmail);
    if (email && !EMAIL.test(email)) problems.guardianEmail = "Check this email address.";
    const phone = tidy(row.guardianPhone);
    if (phone && !/^\+?[\d\s-]{7,16}$/.test(phone)) problems.guardianPhone = "Check the phone number.";

    const given = tidy(row.admissionNo);
    if (given) {
      const key = given.toLowerCase();
      const taken = db.students.find((s) => sameAdmissionNo(s.admissionNo, given));
      if (taken) problems.admissionNo = `${taken.fullName} already has this number.`;
      else if (seenNumbers.has(key)) problems.admissionNo = `Same number as row ${seenNumbers.get(key)! + 1}.`;
      else seenNumbers.set(key, index);
    }
    if (fullName && arm && !problems.fullName) {
      const person = `${fullName.toLowerCase()}|${arm.id}`;
      const already = db.students.find((s) => s.armId === arm.id && s.status === "ACTIVE" && s.fullName.toLowerCase() === fullName.toLowerCase());
      if (already && !given) problems.fullName = `Already in ${arm.name} (${already.admissionNo}). Give an admission number if this is someone else.`;
      else if (seenPeople.has(person) && !given) problems.fullName = `Same as row ${seenPeople.get(person)! + 1}.`;
      else seenPeople.set(person, index);
    }

    const ok = Object.keys(problems).length === 0;
    const admissionNo = given ?? (ok ? formatAdmissionNo(db.admission, sessionStartYear(db), next++) : null);
    if (!ok || body.check) return { row: index, status: ok ? "READY" : "PROBLEM", problems, armName: arm?.name ?? null, admissionNo };

    const invite = body.inviteParents && !!email;
    db.students.push(newStudentRow({
      id: `student-import-${stamp}-${index}`,
      fullName,
      admissionNo: admissionNo!,
      armId: arm!.id,
      gender: gender ?? null,
      dob: dob ?? null,
      joinedOn: body.joinedOn,
      guardian: { name: tidy(row.guardianName), phone, email: email?.toLowerCase() ?? null },
      parentStatus: invite ? "INVITED" : "NONE",
      events: [{ at: body.joinedOn, kind: "ENROLLED", text: `Enrolled in ${arm!.name} as ${admissionNo} (imported)` }],
    }));
    enrolled++;
    if (invite) parentsInvited++;
    return { row: index, status: "ENROLLED", problems, armName: arm!.name, admissionNo };
  });

  if (!body.check) db.admission.next = next;
  return {
    results,
    ready: results.filter((r) => r.status === "READY").length,
    problems: results.filter((r) => r.status === "PROBLEM").length,
    enrolled,
    parentsInvited,
  };
}

export const studentHandlers = [
  http.post("/api/v1/admin/students/import", async ({ request }) => {
    await delay(700);
    const body = (await request.json()) as ImportStudentsRequest;
    if (!body.rows?.length) return HttpResponse.json({ error: "The list has no rows." }, { status: 400 });
    if (body.rows.length > MAX_IMPORT_ROWS) return HttpResponse.json({ error: `That's ${body.rows.length} rows. Import up to ${MAX_IMPORT_ROWS} at a time.` }, { status: 400 });
    if (!body.joinedOn || !DATE.test(body.joinedOn)) return invalid({ joinedOn: "Enter the day they joined." });
    const db = loadSchool(request);
    const response = checkImport(db, body);
    if (!body.check && response.enrolled) {
      db.setup.imported = true;
      saveSchool(db);
    }
    return HttpResponse.json<ImportStudentsResponse>(response);
  }),

  http.get("/api/v1/admin/students/:id", async ({ params, request }) => {
    await delay();
    const db = loadSchool(request);
    const st = db.students.find((s) => s.id === params.id);
    return st ? HttpResponse.json<StudentRecord>(studentRecord(db, st)) : notFound();
  }),

  http.post("/api/v1/admin/students", async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as EnrolStudentRequest;
    const db = loadSchool(request);
    const errors = problemsOf(db, body);
    if (Object.keys(errors).length) return invalid(errors);
    const guardian = guardianOf(body);
    const invite = body.inviteParent && !!guardian.email;
    const st = newStudentRow({
      id: `student-${Date.now()}`,
      fullName: tidy(body.fullName)!,
      admissionNo: tidy(body.admissionNo) ?? takeAdmissionNo(db),
      armId: body.armId,
      gender: body.gender,
      dob: body.dob,
      joinedOn: body.joinedOn,
      guardian,
      parentStatus: invite ? "INVITED" : "NONE",
    });
    st.events = [{ at: body.joinedOn, kind: "ENROLLED", text: `Enrolled in ${db.arms.find((a) => a.id === body.armId)!.name} as ${st.admissionNo}` }];
    if (invite) event(st, "PARENT_INVITED", `Parent invited: ${guardian.email}`);
    db.students.push(st);
    saveSchool(db);
    return HttpResponse.json<EnrolStudentResponse>({ student: studentRecord(db, st), parentInvited: invite }, { status: 201 });
  }),

  http.put("/api/v1/admin/students/:id", async ({ params, request }) => {
    await delay(400);
    const body = (await request.json()) as UpdateStudentRequest;
    const db = loadSchool(request);
    const st = db.students.find((s) => s.id === params.id);
    if (!st) return notFound();
    const errors = problemsOf(db, body, st);
    if (Object.keys(errors).length) return invalid(errors);
    if (body.armId !== st.armId) {
      moveScores(db, st.id, st.armId, body.armId);
      event(st, "MOVED", `Moved from ${db.arms.find((a) => a.id === st.armId)!.name} to ${db.arms.find((a) => a.id === body.armId)!.name}`);
    } else event(st, "DETAILS_CHANGED", "Details updated");
    Object.assign(st, {
      fullName: tidy(body.fullName)!,
      admissionNo: tidy(body.admissionNo)!,
      armId: body.armId,
      gender: body.gender,
      dob: body.dob,
      joinedOn: body.joinedOn,
      guardian: guardianOf(body),
    });
    saveSchool(db);
    return HttpResponse.json<StudentRecord>(studentRecord(db, st));
  }),

  http.post("/api/v1/admin/students/:id/leave", async ({ params, request }) => {
    await delay(400);
    const body = (await request.json()) as LeaveSchoolRequest;
    const db = loadSchool(request);
    const st = db.students.find((s) => s.id === params.id);
    if (!st) return notFound();
    if (st.status !== "ACTIVE") return HttpResponse.json({ error: `${st.fullName} has already left.` }, { status: 409 });
    const errors: Record<string, string> = {};
    if (!LEFT.includes(body.status)) errors.status = "Choose why they're leaving.";
    if (!body.on || !DATE.test(body.on)) errors.on = "Enter the day they left.";
    else if (body.on < st.joinedOn) errors.on = "That's before they joined.";
    else if (body.on > today()) errors.on = "That's in the future. Mark them as left on the day they go.";
    if (Object.keys(errors).length) return invalid(errors);
    st.status = body.status;
    st.left = { on: body.on, reason: tidy(body.reason) };
    event(st, "LEFT", `${body.status === "WITHDRAWN" ? "Withdrawn" : body.status === "TRANSFERRED" ? "Transferred" : "Graduated"}${st.left.reason ? `: ${st.left.reason}` : ""}`);
    saveSchool(db);
    return HttpResponse.json<StudentRecord>(studentRecord(db, st));
  }),

  http.post("/api/v1/admin/students/:id/readmit", async ({ params, request }) => {
    await delay(400);
    const db = loadSchool(request);
    const st = db.students.find((s) => s.id === params.id);
    if (!st) return notFound();
    if (st.status === "ACTIVE") return HttpResponse.json({ error: `${st.fullName} is already a current student.` }, { status: 409 });
    st.status = "ACTIVE";
    st.left = null;
    event(st, "READMITTED", `Readmitted to ${db.arms.find((a) => a.id === st.armId)!.name}`);
    saveSchool(db);
    return HttpResponse.json<StudentRecord>(studentRecord(db, st));
  }),

  http.get("/api/v1/admin/admission-numbers", async ({ request }) => {
    await delay();
    const db = loadSchool(request);
    const { admission } = db;
    return HttpResponse.json<AdmissionNumberSettings>({ ...admission, year: sessionStartYear(db), preview: formatAdmissionNo(admission, sessionStartYear(db), admission.next) });
  }),

  http.put("/api/v1/admin/admission-numbers", async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as AdmissionNumberSettings;
    const format = { pattern: body.pattern?.trim() ?? "", digits: Number(body.digits) };
    const problems = admissionPatternProblems(format);
    if (problems.length) return invalid({ pattern: problems[0]! });
    if (!Number.isInteger(body.next) || body.next < 1) return invalid({ next: "Start from a whole number, 1 or more." });
    const db = loadSchool(request);
    const preview = formatAdmissionNo(format, sessionStartYear(db), body.next);
    const taken = db.students.find((s) => sameAdmissionNo(s.admissionNo, preview));
    if (taken) return invalid({ next: `${taken.fullName} already has ${preview}. Start from a higher number.` });
    db.admission = { ...format, next: body.next };
    saveSchool(db);
    return HttpResponse.json<AdmissionNumberSettings>({ ...db.admission, year: sessionStartYear(db), preview });
  }),
];
