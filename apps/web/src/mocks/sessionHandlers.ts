import { delay, http, HttpResponse } from "msw";
import type { CloseTermRequest, CloseTermResponse, SessionInfo } from "@brillanda/shared-types";
import { loadSchool, saveSchool, sessionNameOf, sheetId, termOf, type SchoolDb, type Sheet } from "./schoolDb";

// Stand-ins for the school year (packages/shared-types/src/admin.ts, DECISIONS.md F-43): this
// session's terms, and closing one term to start the next. Delete with the rest of the stand-ins.

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const today = () => new Date().toISOString().slice(0, 10);
const invalid = (fields: Record<string, string>) =>
  HttpResponse.json({ error: "Check the highlighted fields.", fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, [v]])) }, { status: 400 });

/** Classes with students this term whose results haven't been published. */
export function unpublishedArms(db: SchoolDb) {
  const withStudents = new Set(db.students.filter((s) => s.status === "ACTIVE").map((s) => s.armId));
  return db.arms.filter((a) => withStudents.has(a.id) && !db.published[a.id]).map((a) => ({ id: a.id, name: a.name }));
}

function sessionInfo(db: SchoolDb): SessionInfo {
  return { name: sessionNameOf(db), terms: db.session.terms, unpublishedArms: unpublishedArms(db) };
}

/** Empty score sheets for every arm and subject, for a new term. */
export function freshSheets(db: SchoolDb): Record<string, Sheet> {
  const sheets: Record<string, Sheet> = {};
  for (const arm of db.arms) for (const s of db.subjects) sheets[sheetId(arm.id, s.id)] = { status: "NOT_STARTED", scores: {}, remindedAt: null };
  return sheets;
}

export const sessionHandlers = [
  http.get("/api/v1/admin/session", async ({ request }) => {
    await delay();
    return HttpResponse.json<SessionInfo>(sessionInfo(loadSchool(request)));
  }),

  http.post("/api/v1/admin/session/close-term", async ({ request }) => {
    await delay(700);
    const body = (await request.json()) as CloseTermRequest;
    const db = loadSchool(request);
    const terms = db.session.terms;
    const index = terms.findIndex((t) => t.status === "CURRENT");
    if (index < 0) return HttpResponse.json({ error: "There's no term open to close." }, { status: 409 });
    if (index === terms.length - 1) return HttpResponse.json({ error: "The last term closes with promotion, at the end of the session." }, { status: 409 });

    const next = body.next ?? ({} as CloseTermRequest["next"]);
    const errors: Record<string, string> = {};
    if (!DATE.test(next.startsOn ?? "")) errors.startsOn = "Enter the day it starts.";
    else if (next.startsOn < today()) errors.startsOn = "That's already passed. The next term starts today or later.";
    if (!DATE.test(next.endsOn ?? "")) errors.endsOn = "Enter the day it ends.";
    else if (next.startsOn && next.endsOn <= next.startsOn) errors.endsOn = "The term has to end after it starts.";
    if (!DATE.test(next.scoresDueOn ?? "")) errors.scoresDueOn = "Enter the day scores are due.";
    else if (next.scoresDueOn < next.startsOn || next.scoresDueOn > next.endsOn) errors.scoresDueOn = "Pick a day inside the term.";
    if (Object.keys(errors).length) return invalid(errors);

    const unpublished = unpublishedArms(db);
    if (unpublished.length && !body.closeUnpublished) {
      return HttpResponse.json({ error: `${unpublished.map((a) => a.name).join(", ")} ${unpublished.length === 1 ? "hasn't" : "haven't"} been published yet.` }, { status: 409 });
    }

    const closed = termOf(db);
    db.closedTerms.push({
      term: closed,
      sheets: db.sheets,
      published: db.published,
      armOf: Object.fromEntries(db.students.filter((s) => s.status === "ACTIVE").map((s) => [s.id, s.armId])),
    });
    terms[index] = { ...terms[index]!, status: "CLOSED", endsOn: terms[index]!.endsOn ?? db.term.endsOn, closedOn: today() };
    terms[index + 1] = { ...terms[index + 1]!, status: "CURRENT", startsOn: next.startsOn, endsOn: next.endsOn };
    db.term = { startsOn: next.startsOn, endsOn: next.endsOn, scoresDueOn: next.scoresDueOn, nextTermBegins: next.nextTermBegins || null };
    db.sheets = freshSheets(db);
    db.published = {};
    db.unlocks = [];
    saveSchool(db);
    return HttpResponse.json<CloseTermResponse>({ closed, started: termOf(db) });
  }),
];
