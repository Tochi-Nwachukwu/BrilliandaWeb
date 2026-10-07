import { delay, http, HttpResponse } from "msw";
import type {
  BookCallRequest,
  ChangePlanRequest,
  CreateSchoolRequest,
  DeclineTrialRequest,
  ExtendTrialRequest,
  PlatformActivity,
  PlatformActivityKind,
  PlatformSchool,
  PlatformUsage,
  SuspendSchoolRequest,
  TrialRequest,
} from "@brillanda/shared-types";
import { loadPlatform, savePlatform, type PlatformDb } from "./platformDb";

// Stand-ins for the endpoints in packages/shared-types/src/platform.ts (DECISIONS.md F-36).
// Validation mirrors what the API must do, so the screens' error handling is real.

const DAY = 86_400_000;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const notFound = () => HttpResponse.json({ error: "Not found" }, { status: 404 });
const invalid = (fields: Record<string, string>) =>
  HttpResponse.json(
    { error: "Check the highlighted fields.", fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, [v]])) },
    { status: 400 },
  );

function log(db: PlatformDb, kind: PlatformActivityKind, school: { id: string | null; name: string }, text: string) {
  const entry: PlatformActivity = { id: `act-${Date.now()}-${Math.round(Math.random() * 1e6)}`, at: new Date().toISOString(), kind, schoolId: school.id, schoolName: school.name, text };
  db.activity.unshift(entry);
}

/** Loads the db, finds the school, applies the change, saves, and returns the updated school. */
async function withSchool(id: string | readonly string[] | undefined, change: (school: PlatformSchool, db: PlatformDb) => Response | void) {
  await delay();
  const db = loadPlatform();
  const school = db.schools.find((candidate) => candidate.id === id);
  if (!school) return notFound();
  const early = change(school, db);
  if (early) return early;
  savePlatform(db);
  return HttpResponse.json<PlatformSchool>(school);
}

async function withTrial(id: string | readonly string[] | undefined, change: (trial: TrialRequest, db: PlatformDb) => Response | void) {
  await delay();
  const db = loadPlatform();
  const trial = db.trials.find((candidate) => candidate.id === id);
  if (!trial) return notFound();
  if (trial.status === "SCHOOL_CREATED" || trial.status === "DECLINED") {
    return HttpResponse.json({ error: "This request has already been dealt with." }, { status: 409 });
  }
  const early = change(trial, db);
  if (early) return early;
  savePlatform(db);
  return HttpResponse.json<TrialRequest>(trial);
}

export const platformHandlers = [
  http.get("/api/v1/platform/schools", async () => {
    await delay();
    return HttpResponse.json<PlatformSchool[]>(loadPlatform().schools);
  }),

  http.post("/api/v1/platform/schools", async ({ request }) => {
    await delay();
    const body = (await request.json()) as CreateSchoolRequest;
    const errors: Record<string, string> = {};
    if (!body.name?.trim()) errors.name = "Enter the school's name.";
    if (!body.city?.trim()) errors.city = "Enter the town or city.";
    if (!body.adminName?.trim()) errors.adminName = "Enter the admin's name.";
    if (!EMAIL.test(body.adminEmail?.trim() ?? "")) errors.adminEmail = "Check this email address. The invite goes here.";
    const db = loadPlatform();
    if (db.schools.some((s) => s.name.toLowerCase() === body.name?.trim().toLowerCase())) errors.name = "A school with this name already exists.";
    if (Object.keys(errors).length) return invalid(errors);

    const trial = body.trialRequestId ? db.trials.find((t) => t.id === body.trialRequestId) : undefined;
    const now = new Date();
    const school: PlatformSchool = {
      id: `school-${now.getTime()}`,
      name: body.name.trim(),
      city: body.city.trim(),
      status: "ACTIVE",
      planTier: body.planTier,
      trialEndsAt: body.planTier === "TRIAL" ? new Date(now.getTime() + 30 * DAY).toISOString() : null,
      studentCount: 0,
      studentLimit: body.planTier === "TRIAL" ? 300 : 600,
      scoresInShare: null,
      admin: { fullName: body.adminName.trim(), email: body.adminEmail.trim().toLowerCase() },
      createdAt: now.toISOString(),
      lastActiveAt: null,
      suspendedReason: null,
    };
    db.schools.push(school);
    if (trial) {
      trial.status = "SCHOOL_CREATED";
      trial.schoolId = school.id;
    }
    log(db, "SCHOOL_CREATED", { id: school.id, name: school.name }, `${school.name} was created. An invite went to ${school.admin!.email}.`);
    savePlatform(db);
    return HttpResponse.json<PlatformSchool>(school, { status: 201 });
  }),

  http.post("/api/v1/platform/schools/:id/suspend", async ({ params, request }) => {
    const { reason } = (await request.json()) as SuspendSchoolRequest;
    return withSchool(params.id, (school, db) => {
      if (!reason?.trim()) return invalid({ reason: "Say why, so the school's admin can be told." });
      school.status = "SUSPENDED";
      school.suspendedReason = reason.trim();
      log(db, "SUSPEND", { id: school.id, name: school.name }, `${school.name} was suspended. ${school.suspendedReason}`);
    });
  }),

  http.post("/api/v1/platform/schools/:id/restore", ({ params }) =>
    withSchool(params.id, (school, db) => {
      school.status = "ACTIVE";
      school.suspendedReason = null;
      log(db, "RESTORE", { id: school.id, name: school.name }, `${school.name}'s access was restored.`);
    }),
  ),

  http.post("/api/v1/platform/schools/:id/extend-trial", async ({ params, request }) => {
    const { days } = (await request.json()) as ExtendTrialRequest;
    return withSchool(params.id, (school, db) => {
      if (school.planTier !== "TRIAL" || !school.trialEndsAt) {
        return HttpResponse.json({ error: "Only a school on a trial can have it extended." }, { status: 409 });
      }
      school.trialEndsAt = new Date(new Date(school.trialEndsAt).getTime() + days * DAY).toISOString();
      log(db, "BILLING", { id: school.id, name: school.name }, `${school.name}'s trial was extended by ${days} days.`);
    });
  }),

  http.post("/api/v1/platform/schools/:id/plan", async ({ params, request }) => {
    const { planTier } = (await request.json()) as ChangePlanRequest;
    return withSchool(params.id, (school, db) => {
      school.planTier = planTier;
      school.trialEndsAt = planTier === "TRIAL" ? school.trialEndsAt : null;
      if (planTier !== "TRIAL") school.studentLimit = Math.max(school.studentLimit, 600);
      log(db, "BILLING", { id: school.id, name: school.name }, `${school.name} moved to the ${planTier.toLowerCase()} plan.`);
    });
  }),

  http.get("/api/v1/platform/trial-requests", async () => {
    await delay();
    return HttpResponse.json<TrialRequest[]>(loadPlatform().trials);
  }),

  http.post("/api/v1/platform/trial-requests/:id/book-call", async ({ params, request }) => {
    const { callAt } = (await request.json()) as BookCallRequest;
    return withTrial(params.id, (trial) => {
      if (Number.isNaN(Date.parse(callAt))) return invalid({ callAt: "Pick a day and time for the call." });
      trial.status = "CALL_BOOKED";
      trial.callAt = callAt;
    });
  }),

  http.post("/api/v1/platform/trial-requests/:id/decline", async ({ params, request }) => {
    const { reason } = (await request.json()) as DeclineTrialRequest;
    return withTrial(params.id, (trial, db) => {
      trial.status = "DECLINED";
      log(db, "TRIAL_REQUEST", { id: null, name: trial.schoolName }, `${trial.schoolName}'s trial request was declined.${reason?.trim() ? ` ${reason.trim()}` : ""}`);
    });
  }),

  http.get("/api/v1/platform/activity", async () => {
    await delay();
    const activity = [...loadPlatform().activity].sort((a, b) => b.at.localeCompare(a.at));
    return HttpResponse.json<PlatformActivity[]>(activity);
  }),

  http.get("/api/v1/platform/usage", async () => {
    await delay();
    return HttpResponse.json<PlatformUsage>({ signedInToday: 1284, byRole: { teachers: 912, parents: 283, admins: 89 } });
  }),
];
