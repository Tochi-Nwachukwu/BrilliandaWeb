// FAKE: CBT tests (batch 25) on sample data. The backend replaces this with stored tests and
// attempts, the clock kept on the server, and the same marking rules (packages/core/src/cbt.ts).
// Teachers set tests for the classes they teach that subject in; admins for any class.
import "server-only";
import { deadlineOf, GRACE_MS, newAccessCode, scaleTo, scoreAttempt, windowState, type TestSettings } from "@brillianda/core/cbt";
import { seededOrder, totalMarks, type Response } from "@brillianda/core/questions";
import { fullName } from "@brillianda/core/students";
import type { ActionResult, StudentTestRow, TakingTest, TestEditorData, TestResults, TestRow } from "../types";
import { requireStaff, requireStudent } from "./auth";
import { recordChange } from "./changes";
import { pairsFor } from "./questions";
import { resultsTermOf, settingsOf } from "./results";
import { store } from "./store";
import { armOptions } from "./students";

const pause = () => new Promise((resolve) => setTimeout(resolve, 250));
type Test = (typeof store.tests)[number];
type Attempt = (typeof store.attempts)[number];

async function staff(subdomain: string) {
  const s = await requireStaff(subdomain);
  if (!s) return null;
  return { user: s.user, admin: s.role === "owner" || s.role === "admin" };
}

/** The arms a person may set a test for, in a subject and class level. */
function armsFor(subdomain: string, userId: string, admin: boolean, subjectId: string, levelId: string) {
  return armOptions(subdomain)
    .filter((a) => a.levelId === levelId)
    .filter((a) => admin || store.subjectTeachers.some((t) => t.userId === userId && t.subjectId === subjectId && t.armId === a.id))
    .map((a) => ({ id: a.id, label: a.label }));
}

const studentsOf = (armIds: string[]) => store.students.filter((s) => armIds.includes(s.armId) && !s.deletedAt && s.status === "active");
const subjectName = (id: string) => store.subjects.find((s) => s.id === id)?.name ?? "";
const levelName = (id: string) => store.levels.find((l) => l.id === id)?.name ?? "";

/** Ends attempts whose time ran out: the real one does this on the server's clock. */
function closeExpired(test: Test, now = Date.now()) {
  for (const a of store.attempts.filter((x) => x.testId === test.id && !x.submittedAt)) {
    if (now > deadlineOf(a.startedAt, test.durationMinutes, test) + GRACE_MS) a.submittedAt = deadlineOf(a.startedAt, test.durationMinutes, test);
  }
}

function rowOf(subdomain: string, t: Test, meId: string): TestRow {
  closeExpired(t);
  const labels = new Map(armOptions(subdomain).map((a) => [a.id, a.label]));
  const attempts = store.attempts.filter((a) => a.testId === t.id);
  const toMark = attempts.filter((a) => a.submittedAt).reduce((n, a) => n + scoreAttempt(t.questions, a.responses, a.theoryMarks).toMark, 0);
  return {
    id: t.id,
    title: t.title,
    subjectName: subjectName(t.subjectId),
    levelName: levelName(t.levelId),
    armLabels: t.armIds.map((id) => labels.get(id) ?? ""),
    questions: t.questions.length,
    marks: totalMarks(t.questions),
    durationMinutes: t.durationMinutes,
    opensAt: t.opensAt,
    closesAt: t.closesAt,
    where: t.where,
    status: t.status,
    window: windowState(t, Date.now()),
    submitted: attempts.filter((a) => a.submittedAt).length,
    students: studentsOf(t.armIds).length,
    toMark,
    sentAt: t.sentAt,
    by: t.by,
    byMe: t.byId === meId,
  };
}

/** A test this person may see and change: their own, or any for admins. */
function testFor(subdomain: string, id: string, me: { user: { id: string }; admin: boolean }) {
  const t = store.tests.find((x) => x.subdomain === subdomain && x.id === id);
  return t && (me.admin || t.byId === me.user.id) ? t : null;
}

// ——— Teachers and admins ———

export async function getTests(subdomain: string): Promise<TestRow[] | null> {
  const me = await staff(subdomain);
  if (!me) return null;
  return store.tests
    .filter((t) => t.subdomain === subdomain && (me.admin || t.byId === me.user.id))
    .sort((a, b) => b.opensAt.localeCompare(a.opensAt))
    .map((t) => rowOf(subdomain, t, me.user.id));
}

export async function getTestEditor(subdomain: string, testId?: string): Promise<TestEditorData | null> {
  const me = await staff(subdomain);
  if (!me) return null;
  const pairs = pairsFor(subdomain, me.user.id, me.admin)
    .map((p) => ({ ...p, arms: armsFor(subdomain, me.user.id, me.admin, p.subjectId, p.levelId) }))
    .filter((p) => p.arms.length);
  const t = testId ? testFor(subdomain, testId, me) : null;
  if (testId && (!t || t.status !== "draft")) return null;
  const bank = store.questionBank.filter((q) => q.subdomain === subdomain && pairs.some((p) => p.subjectId === q.subjectId && p.levelId === q.levelId));
  return {
    pairs,
    bank: bank.map((q) => ({ id: q.id, subjectId: q.subjectId, levelId: q.levelId, question: q.question, source: q.source, by: q.by, byMe: q.byId === me.user.id, at: q.at })),
    components: settingsOf(subdomain).components,
    test: t
      ? {
          id: t.id,
          subjectId: t.subjectId,
          levelId: t.levelId,
          title: t.title,
          instructions: t.instructions,
          armIds: t.armIds,
          // Only the ones still in the bank.
          questionIds: t.questionIds.filter((qid) => bank.some((b) => b.id === qid)),
          durationMinutes: t.durationMinutes,
          opensAt: t.opensAt,
          closesAt: t.closesAt,
          where: t.where,
          shuffle: t.shuffle,
          showScore: t.showScore,
          componentId: t.componentId,
        }
      : null,
  };
}

/** Saves a draft (new or changed). `publish` makes it visible to students in its window. */
export async function saveTest(subdomain: string, id: string | null, subjectId: string, levelId: string, input: TestSettings, publish: boolean): Promise<ActionResult<{ id: string }>> {
  await pause();
  const me = await staff(subdomain);
  if (!me) return { ok: false, error: "Sign in as a teacher to do this." };
  const allowedArms = armsFor(subdomain, me.user.id, me.admin, subjectId, levelId).map((a) => a.id);
  if (!allowedArms.length || input.armIds.some((a) => !allowedArms.includes(a))) return { ok: false, error: "You can set tests only for the classes you teach this subject in." };
  const questions = input.questionIds.map((qid) => store.questionBank.find((q) => q.subdomain === subdomain && q.id === qid && q.subjectId === subjectId && q.levelId === levelId)?.question);
  if (questions.some((q) => !q)) return { ok: false, error: "A question isn’t in this subject’s bank any more. Reload and choose again." };
  if (!settingsOf(subdomain).components.some((c) => c.id === input.componentId)) return { ok: false, error: "Choose where the scores go." };
  const existing = id ? testFor(subdomain, id, me) : null;
  if (id && (!existing || existing.status !== "draft")) return { ok: false, error: "Only drafts can be changed. Students may already be taking this test." };
  const fields = {
    title: input.title,
    instructions: input.instructions,
    subjectId,
    levelId,
    armIds: input.armIds,
    // A copy: changing the bank later doesn't change a test students have taken.
    questions: questions.map((q) => structuredClone(q!)),
    questionIds: input.questionIds,
    durationMinutes: input.durationMinutes,
    opensAt: input.opensAt,
    closesAt: input.closesAt,
    where: input.where,
    shuffle: input.shuffle,
    showScore: input.showScore,
    componentId: input.componentId,
    status: publish ? ("published" as const) : ("draft" as const),
  };
  let testId = existing?.id;
  if (existing) Object.assign(existing, fields);
  else {
    testId = crypto.randomUUID();
    store.tests.push({ id: testId, subdomain, ...fields, accessCode: newAccessCode(), term: resultsTermOf(subdomain)?.key ?? "", byId: me.user.id, by: me.user.fullName, at: Date.now(), sentAt: null });
  }
  if (publish) recordChange(subdomain, me.user.fullName, `Set the test “${input.title}” for ${levelName(levelId)} ${subjectName(subjectId)}`);
  return { ok: true, data: { id: testId! } };
}

export async function deleteTest(subdomain: string, id: string): Promise<ActionResult<null>> {
  await pause();
  const me = await staff(subdomain);
  const t = me && testFor(subdomain, id, me);
  if (!me || !t) return { ok: false, error: "That test isn’t yours to delete." };
  if (store.attempts.some((a) => a.testId === id)) return { ok: false, error: "Students have started this test, so it stays. You can stop sending its scores." };
  store.tests = store.tests.filter((x) => x !== t);
  return { ok: true, data: null };
}

export async function getTestResults(subdomain: string, id: string): Promise<TestResults | null> {
  const me = await staff(subdomain);
  const t = me && testFor(subdomain, id, me);
  if (!me || !t) return null;
  const row = rowOf(subdomain, t, me.user.id);
  const labels = new Map(armOptions(subdomain).map((a) => [a.id, a.label]));
  const component = settingsOf(subdomain).components.find((c) => c.id === t.componentId) ?? null;
  const attempts = store.attempts.filter((a) => a.testId === t.id);
  const rows = studentsOf(t.armIds)
    .map((s) => {
      const a = attempts.find((x) => x.studentId === s.id);
      return {
        studentId: s.id,
        fullName: fullName(s),
        armLabel: labels.get(s.armId) ?? "",
        state: !a ? ("not started" as const) : a.submittedAt ? ("submitted" as const) : ("in progress" as const),
        attemptId: a?.id ?? null,
        score: a ? scoreAttempt(t.questions, a.responses, a.theoryMarks) : null,
        leftPage: a?.leftPage ?? 0,
        responses: a?.responses ?? {},
        theoryMarks: a?.theoryMarks ?? {},
      };
    })
    .sort((x, y) => x.armLabel.localeCompare(y.armLabel) || x.fullName.localeCompare(y.fullName));
  const done = attempts.filter((a) => a.submittedAt);
  const stats = t.questions.map((q, i) => {
    const answered = done.filter((a) => a.responses[i] !== undefined).length;
    if (q.type === "theory") return { answered, right: null };
    return { answered, right: done.filter((a) => scoreAttempt([q], { 0: a.responses[i] }, {}).auto === q.marks).length };
  });
  return { test: { ...row, accessCode: t.accessCode, showScore: t.showScore, component, questionList: t.questions }, rows, stats };
}

/** The teacher's mark for one theory answer. */
export async function markTheory(subdomain: string, testId: string, attemptId: string, index: number, marks: number): Promise<ActionResult<null>> {
  const me = await staff(subdomain);
  const t = me && testFor(subdomain, testId, me);
  const a = store.attempts.find((x) => x.id === attemptId && x.testId === testId);
  if (!me || !t || !a) return { ok: false, error: "That answer isn’t here any more." };
  const q = t.questions[index];
  if (!q || q.type !== "theory") return { ok: false, error: "Only theory answers are marked by hand." };
  if (!a.submittedAt) return { ok: false, error: "Wait until the student submits." };
  if (marks < 0 || marks > q.marks) return { ok: false, error: `Give between 0 and ${q.marks} marks.` };
  a.theoryMarks[index] = Math.round(marks * 2) / 2;
  return { ok: true, data: null };
}

/**
 * Puts the scores of every submitted, fully marked attempt into the chosen score-sheet part for
 * this term, scaled to that part's marks. Sheets marked complete are left alone.
 */
export async function sendScores(subdomain: string, testId: string): Promise<ActionResult<{ sent: number; skipped: number; lockedClasses: string[] }>> {
  await pause();
  const me = await staff(subdomain);
  const t = me && testFor(subdomain, testId, me);
  if (!me || !t) return { ok: false, error: "That test isn’t yours." };
  const term = resultsTermOf(subdomain);
  if (!term) return { ok: false, error: "No term is open for scores." };
  const component = settingsOf(subdomain).components.find((c) => c.id === t.componentId);
  if (!component) return { ok: false, error: "The score-sheet part this test sends to isn’t in the results settings any more." };
  closeExpired(t);
  const labels = new Map(armOptions(subdomain).map((a) => [a.id, a.label]));
  const locked = t.armIds.filter((armId) => store.completeSheets.some((c) => c.term === term.key && c.armId === armId && c.subjectId === t.subjectId));
  let sent = 0;
  let skipped = 0;
  for (const a of store.attempts.filter((x) => x.testId === t.id)) {
    const s = store.students.find((x) => x.id === a.studentId);
    if (!s || locked.includes(s.armId)) continue;
    const score = scoreAttempt(t.questions, a.responses, a.theoryMarks);
    if (!a.submittedAt || score.toMark > 0) {
      skipped++;
      continue;
    }
    const value = scaleTo(score.total, score.max, component.maxScore);
    store.scores = store.scores.filter((x) => !(x.term === term.key && x.armId === s.armId && x.subjectId === t.subjectId && x.studentId === s.id && x.componentId === component.id));
    store.scores.push({ term: term.key, armId: s.armId, subjectId: t.subjectId, studentId: s.id, componentId: component.id, value, isAbsent: false });
    sent++;
  }
  t.sentAt = Date.now();
  recordChange(subdomain, me.user.fullName, `Sent ${sent} scores from “${t.title}” to ${component.name}`);
  return { ok: true, data: { sent, skipped, lockedClasses: locked.map((id) => labels.get(id) ?? "") } };
}

// ——— Students ———

async function student(subdomain: string) {
  return requireStudent(subdomain);
}

function testsForStudent(subdomain: string, armId: string) {
  return store.tests.filter((t) => t.subdomain === subdomain && t.status === "published" && t.armIds.includes(armId));
}

export async function getMyTests(subdomain: string): Promise<StudentTestRow[] | null> {
  const me = await student(subdomain);
  if (!me) return null;
  const now = Date.now();
  return testsForStudent(subdomain, me.student.armId)
    .map((t) => {
      closeExpired(t, now);
      const a = store.attempts.find((x) => x.testId === t.id && x.studentId === me.student.id);
      const s = a?.submittedAt ? scoreAttempt(t.questions, a.responses, a.theoryMarks) : null;
      return {
        id: t.id,
        title: t.title,
        subjectName: subjectName(t.subjectId),
        durationMinutes: t.durationMinutes,
        questions: t.questions.length,
        opensAt: t.opensAt,
        closesAt: t.closesAt,
        where: t.where,
        window: windowState(t, now),
        attempt: !a ? ("none" as const) : a.submittedAt ? ("submitted" as const) : ("in progress" as const),
        score: s && t.showScore ? { total: s.total, max: s.max, complete: s.toMark === 0 } : null,
      };
    })
    .sort((x, y) => x.opensAt.localeCompare(y.opensAt));
}

function attemptOf(testId: string, studentId: string) {
  return store.attempts.find((a) => a.testId === testId && a.studentId === studentId) ?? null;
}

function taking(t: Test, a: Attempt | null): TakingTest {
  // The order is fixed per attempt, so reloading doesn't reshuffle and neighbours differ.
  const seed = a?.id ?? t.id;
  const order = t.shuffle ? seededOrder(t.questions.length, seed) : t.questions.map((_, i) => i);
  return {
    id: t.id,
    title: t.title,
    instructions: t.instructions,
    subjectName: subjectName(t.subjectId),
    durationMinutes: t.durationMinutes,
    where: t.where,
    deadline: a ? deadlineOf(a.startedAt, t.durationMinutes, t) : null,
    submitted: !!a?.submittedAt,
    questions: a
      ? order.map((index) => {
          const q = t.questions[index]!;
          const options = q.type === "objective" ? (t.shuffle ? seededOrder(q.options.length, `${seed}:${index}`) : q.options.map((_, i) => i)).map((i) => ({ index: i, text: q.options[i]! })) : [];
          return { index, type: q.type, text: q.text, marks: q.marks, options };
        })
      : [],
    responses: a?.responses ?? {},
  };
}

/** The test, for its start page or while taking it. Never includes the answers. */
export async function getTakingTest(subdomain: string, testId: string): Promise<TakingTest | null> {
  const me = await student(subdomain);
  if (!me) return null;
  const t = testsForStudent(subdomain, me.student.armId).find((x) => x.id === testId);
  if (!t) return null;
  closeExpired(t);
  return taking(t, attemptOf(t.id, me.student.id));
}

export async function startTest(subdomain: string, testId: string, code: string): Promise<ActionResult<null>> {
  await pause();
  const me = await student(subdomain);
  const t = me && testsForStudent(subdomain, me.student.armId).find((x) => x.id === testId);
  if (!me || !t) return { ok: false, error: "This test isn’t for your class." };
  if (attemptOf(t.id, me.student.id)) return { ok: true, data: null };
  const state = windowState(t, Date.now());
  if (state === "before") return { ok: false, error: "This test hasn’t opened yet." };
  if (state === "closed") return { ok: false, error: "This test has closed." };
  if (t.where === "school" && code.trim().toUpperCase() !== t.accessCode) return { ok: false, error: "That code isn’t right. Ask your teacher for the code in the room.", fieldErrors: { code: ["That code isn’t right"] } };
  store.attempts.push({ id: crypto.randomUUID(), testId: t.id, studentId: me.student.id, startedAt: Date.now(), submittedAt: null, responses: {}, theoryMarks: {}, leftPage: 0 });
  return { ok: true, data: null };
}

function liveAttempt(t: Test, studentId: string): Attempt | string {
  const a = attemptOf(t.id, studentId);
  if (!a) return "Start the test first.";
  if (a.submittedAt) return "You’ve already submitted this test.";
  if (Date.now() > deadlineOf(a.startedAt, t.durationMinutes, t) + GRACE_MS) {
    closeExpired(t);
    return "Time is up. Your answers were submitted.";
  }
  return a;
}

/** Saves one answer as the student goes (null clears it). */
export async function saveAnswer(subdomain: string, testId: string, index: number, response: Response | null): Promise<ActionResult<null>> {
  const me = await student(subdomain);
  const t = me && testsForStudent(subdomain, me.student.armId).find((x) => x.id === testId);
  if (!me || !t) return { ok: false, error: "This test isn’t for your class." };
  const a = liveAttempt(t, me.student.id);
  if (typeof a === "string") return { ok: false, error: a };
  if (!t.questions[index]) return { ok: false, error: "That question isn’t in this test." };
  if (response === null) delete a.responses[index];
  else a.responses[index] = response;
  return { ok: true, data: null };
}

/** The student left the test page (another tab or app): their teacher sees how often. */
export async function noteLeftPage(subdomain: string, testId: string): Promise<void> {
  const me = await student(subdomain);
  const a = me && attemptOf(testId, me.student.id);
  if (a && !a.submittedAt) a.leftPage++;
}

export async function submitTest(subdomain: string, testId: string): Promise<ActionResult<{ score: { total: number; max: number; complete: boolean } | null }>> {
  await pause();
  const me = await student(subdomain);
  const t = me && testsForStudent(subdomain, me.student.armId).find((x) => x.id === testId);
  if (!me || !t) return { ok: false, error: "This test isn’t for your class." };
  const a = attemptOf(t.id, me.student.id);
  if (!a) return { ok: false, error: "Start the test first." };
  if (!a.submittedAt) a.submittedAt = Math.min(Date.now(), deadlineOf(a.startedAt, t.durationMinutes, t) + GRACE_MS);
  const s = scoreAttempt(t.questions, a.responses, a.theoryMarks);
  return { ok: true, data: { score: t.showScore ? { total: s.total, max: s.max, complete: s.toMark === 0 } : null } };
}
