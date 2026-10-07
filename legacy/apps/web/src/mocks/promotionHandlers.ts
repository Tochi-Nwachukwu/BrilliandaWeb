import { delay, http, HttpResponse } from "msw";
import { computeSubjectTotal } from "@brillanda/shared-types";
import type {
  CompletePromotionRequest,
  CompletePromotionResponse,
  PassMarkRequest,
  PromotionChangeRequest,
  PromotionDecision,
  PromotionPlan,
  PromotionStudent,
} from "@brillanda/shared-types";
import { armResults, cellsOf } from "./adminHandlers";
import { asClosed, COMPONENTS, defaultSession, loadSchool, saveSchool, sessionNameOf, sessionStartYear, sheetId, termOf, type SchoolDb, type StudentRow } from "./schoolDb";
import { freshSheets, unpublishedArms } from "./sessionHandlers";
import { studentRecord } from "./studentHandlers";

// Stand-ins for promotion at the end of a session (packages/shared-types/src/admin.ts,
// DECISIONS.md F-44): yearly averages, suggested decisions, changes by hand, and closing the
// session to start the next. Delete with the rest of the stand-ins when the API ships.

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const today = () => new Date().toISOString().slice(0, 10);
const round = (n: number) => Math.round(n * 100) / 100;
const invalid = (fields: Record<string, string>) =>
  HttpResponse.json({ error: "Check the highlighted fields.", fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, [v]])) }, { status: 400 });

/**
 * Every student's average for one term: all subjects once their class is complete, otherwise only
 * the subjects that are. Worked out a class at a time, not a student at a time.
 */
function termAverages(db: SchoolDb): Map<string, number> {
  const out = new Map<string, number>();
  for (const arm of db.arms) {
    const results = armResults(db, arm.id);
    for (const [id, totals] of results.totals) {
      if (results.complete) {
        out.set(id, results.averages.get(id)!);
        continue;
      }
      const complete = db.subjects
        .map((s, i) => ({ i, done: computeSubjectTotal(COMPONENTS, cellsOf(db.sheets[sheetId(arm.id, s.id)]!.scores[id] ?? [null, null, null])).complete }))
        .filter((x) => x.done)
        .map((x) => totals[x.i]!);
      if (complete.length) out.set(id, round(complete.reduce((a, b) => a + b, 0) / complete.length));
    }
  }
  return out;
}

/** For every student, the average of this session's term averages and how many terms had results. */
function yearlyAverages(db: SchoolDb): Map<string, { average: number | null; terms: number }> {
  const session = sessionNameOf(db);
  const terms = [...db.closedTerms.filter((ct) => ct.term.sessionName === session).map((ct) => termAverages(asClosed(db, ct))), termAverages(db)];
  return new Map(
    db.students.map((st) => {
      const averages = terms.map((t) => t.get(st.id)).filter((a): a is number => a !== undefined);
      return [st.id, { average: averages.length ? round(averages.reduce((a, b) => a + b, 0) / averages.length) : null, terms: averages.length }];
    }),
  );
}

const yearlyAverage = (db: SchoolDb, st: StudentRow) => yearlyAverages(db).get(st.id)!;

/** The scale's lowest passing total, unless the school has set its own pass mark. */
const passMarkOf = (db: SchoolDb) => db.promotion?.passMark ?? Math.min(...db.scale.filter((b) => b.isPass).map((b) => b.minScore));

const finalOrder = (db: SchoolDb) => Math.max(...db.classes.map((c) => c.order));
const orderOf = (db: SchoolDb, armId: string) => db.classes.find((c) => c.id === db.arms.find((a) => a.id === armId)!.classId)!.order;

/** Next session's arm: the next class with the same letter (JSS 1A → JSS 2A), or that class's first arm. */
function destinationOf(db: SchoolDb, armId: string, decision: PromotionDecision) {
  if (decision === "GRADUATE") return null;
  const arm = db.arms.find((a) => a.id === armId)!;
  if (decision === "REPEAT") return arm;
  const next = db.classes.find((c) => c.order === orderOf(db, armId) + 1);
  if (!next) return null;
  const arms = db.arms.filter((a) => a.classId === next.id);
  return arms.find((a) => a.name.slice(-1) === arm.name.slice(-1)) ?? arms[0]!;
}

function suggestionOf(db: SchoolDb, st: StudentRow, average: number | null): PromotionDecision {
  if (orderOf(db, st.armId) === finalOrder(db)) return "GRADUATE";
  return average === null || average >= passMarkOf(db) ? "PROMOTE" : "REPEAT";
}

function planOf(db: SchoolDb): PromotionPlan {
  const terms = db.session.terms;
  const changes = db.promotion?.decisions ?? {};
  const counts: PromotionPlan["counts"] = { PROMOTE: 0, REPEAT: 0, GRADUATE: 0 };
  const yearly = yearlyAverages(db);
  const classes = [...db.arms]
    .map((arm) => ({ arm, order: orderOf(db, arm.id) }))
    .sort((a, b) => a.order - b.order || a.arm.name.localeCompare(b.arm.name))
    .map(({ arm, order }) => ({
      armId: arm.id,
      armName: arm.name,
      classOrder: order,
      students: db.students
        .filter((s) => s.status === "ACTIVE" && s.armId === arm.id)
        .map((st): PromotionStudent => {
          const { average, terms: counted } = yearly.get(st.id)!;
          const suggested = suggestionOf(db, st, average);
          const change = changes[st.id];
          const decision = change?.decision ?? suggested;
          counts[decision]++;
          return {
            id: st.id,
            fullName: st.fullName,
            admissionNo: st.admissionNo,
            yearlyAverage: average,
            termsCounted: counted,
            suggested,
            decision,
            reason: change?.reason ?? null,
            destination: destinationOf(db, st.armId, decision)?.name ?? null,
          };
        }),
    }))
    .filter((c) => c.students.length);
  return {
    sessionName: sessionNameOf(db),
    nextSessionName: `${sessionStartYear(db) + 1}/${sessionStartYear(db) + 2}`,
    passMark: passMarkOf(db),
    open: terms[terms.length - 1]!.status === "CURRENT",
    classes,
    counts,
    unpublishedArms: unpublishedArms(db),
  };
}

export const promotionHandlers = [
  http.get("/api/v1/admin/promotion", async ({ request }) => {
    await delay(500);
    return HttpResponse.json<PromotionPlan>(planOf(loadSchool(request)));
  }),

  http.put("/api/v1/admin/promotion/pass-mark", async ({ request }) => {
    await delay(300);
    const { passMark } = (await request.json()) as PassMarkRequest;
    if (typeof passMark !== "number" || Number.isNaN(passMark) || passMark < 0 || passMark > 100) return invalid({ passMark: "Use a number from 0 to 100." });
    const db = loadSchool(request);
    db.promotion = { passMark, decisions: db.promotion?.decisions ?? {} };
    saveSchool(db);
    return HttpResponse.json<PromotionPlan>(planOf(db));
  }),

  http.put("/api/v1/admin/promotion/students/:id", async ({ params, request }) => {
    await delay(300);
    const body = (await request.json()) as PromotionChangeRequest;
    const db = loadSchool(request);
    const st = db.students.find((s) => s.id === params.id && s.status === "ACTIVE");
    if (!st) return HttpResponse.json({ error: "Not found" }, { status: 404 });
    const final = orderOf(db, st.armId) === finalOrder(db);
    const allowed: PromotionDecision[] = final ? ["GRADUATE", "REPEAT"] : ["PROMOTE", "REPEAT"];
    if (!allowed.includes(body.decision)) return invalid({ decision: final ? "Final-year students graduate or repeat." : "Choose move up or repeat." });
    db.promotion ??= { passMark: null, decisions: {} };
    const suggested = suggestionOf(db, st, yearlyAverage(db, st).average);
    const reason = body.reason?.trim() || null;
    if (body.decision === suggested && !reason) delete db.promotion.decisions[st.id];
    else db.promotion.decisions[st.id] = { decision: body.decision, reason };
    saveSchool(db);
    return HttpResponse.json<PromotionPlan>(planOf(db));
  }),

  http.post("/api/v1/admin/promotion/complete", async ({ request }) => {
    await delay(900);
    const body = (await request.json()) as CompletePromotionRequest;
    const db = loadSchool(request);
    const terms = db.session.terms;
    const last = terms[terms.length - 1]!;
    if (last.status !== "CURRENT") return HttpResponse.json({ error: "Promotion happens in the session's last term." }, { status: 409 });

    const first = body.firstTerm ?? ({} as CompletePromotionRequest["firstTerm"]);
    const errors: Record<string, string> = {};
    if (!DATE.test(first.startsOn ?? "")) errors.startsOn = "Enter the day it starts.";
    else if (first.startsOn < today()) errors.startsOn = "That's already passed. The new session starts today or later.";
    if (!DATE.test(first.endsOn ?? "")) errors.endsOn = "Enter the day it ends.";
    else if (first.startsOn && first.endsOn <= first.startsOn) errors.endsOn = "The term has to end after it starts.";
    if (!DATE.test(first.scoresDueOn ?? "")) errors.scoresDueOn = "Enter the day scores are due.";
    else if (first.scoresDueOn < first.startsOn || first.scoresDueOn > first.endsOn) errors.scoresDueOn = "Pick a day inside the term.";
    if (Object.keys(errors).length) return invalid(errors);
    const unpublished = unpublishedArms(db);
    if (unpublished.length && !body.closeUnpublished) {
      return HttpResponse.json({ error: `${unpublished.map((a) => a.name).join(", ")} ${unpublished.length === 1 ? "hasn't" : "haven't"} been published yet.` }, { status: 409 });
    }

    // Decide everyone first, with the session as it stands, then close the term and move them.
    const plan = planOf(db);
    const decided = new Map(plan.classes.flatMap((c) => c.students.map((s) => [s.id, s.decision] as const)));
    const closedTerm = termOf(db);
    db.closedTerms.push({
      term: closedTerm,
      sheets: db.sheets,
      published: db.published,
      armOf: Object.fromEntries(db.students.filter((s) => s.status === "ACTIVE").map((s) => [s.id, s.armId])),
    });
    terms[terms.length - 1] = { ...last, status: "CLOSED", closedOn: today() };

    const counts = { promoted: 0, repeating: 0, graduated: 0 };
    const now = new Date().toISOString();
    for (const st of db.students) {
      const decision = decided.get(st.id);
      if (!decision) continue;
      st.pastClasses = studentRecord(db, st).classHistory;
      const from = db.arms.find((a) => a.id === st.armId)!;
      const to = destinationOf(db, st.armId, decision);
      const events = (st.events ??= []);
      if (decision === "GRADUATE") {
        st.status = "GRADUATED";
        st.left = { on: today(), reason: `Finished ${from.name}` };
        events.unshift({ at: now, kind: "LEFT", text: `Graduated from ${from.name}` });
        counts.graduated++;
      } else if (decision === "REPEAT") {
        events.unshift({ at: now, kind: "MOVED", text: `Repeating ${from.name}` });
        counts.repeating++;
      } else {
        st.armId = to!.id;
        events.unshift({ at: now, kind: "MOVED", text: `Moved up from ${from.name} to ${to!.name}` });
        counts.promoted++;
      }
    }

    db.session = defaultSession(first, sessionStartYear(db) + 1);
    db.term = { startsOn: first.startsOn, endsOn: first.endsOn, scoresDueOn: first.scoresDueOn, nextTermBegins: first.nextTermBegins || null };
    db.sheets = freshSheets(db);
    db.published = {};
    db.unlocks = [];
    db.promotion = undefined;
    saveSchool(db);
    return HttpResponse.json<CompletePromotionResponse>({ sessionName: sessionNameOf(db), ...counts });
  }),
];
