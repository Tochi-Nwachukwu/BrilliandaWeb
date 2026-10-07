import type { PlatformActivity, PlatformSchool, TrialRequest } from "@brillanda/shared-types";

// Stand-in data for the Brillanda team portal (DECISIONS.md D-7, F-36). Seeded once, relative to
// the day it is first opened, then kept in localStorage so changes survive a reload. Delete this
// file when the platform endpoints ship.

const STORAGE_KEY = "brillanda:platform-v2";
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

export type PlatformDb = { schools: PlatformSchool[]; trials: TrialRequest[]; activity: PlatformActivity[] };

function seed(now = Date.now()): PlatformDb {
  const ago = (ms: number) => new Date(now - ms).toISOString();
  const inDays = (days: number) => new Date(now + days * DAY).toISOString();
  const school = (s: Partial<PlatformSchool> & Pick<PlatformSchool, "id" | "name" | "city">): PlatformSchool => ({
    status: "ACTIVE",
    planTier: "STANDARD",
    trialEndsAt: null,
    studentCount: 0,
    studentLimit: 600,
    scoresInShare: null,
    admin: null,
    createdAt: ago(200 * DAY),
    lastActiveAt: ago(HOUR),
    suspendedReason: null,
    ...s,
  });

  return {
    schools: [
      school({ id: "school-greenfield", name: "Greenfield College", city: "Lekki, Lagos", studentCount: 363, scoresInShare: 0.63, admin: { fullName: "Funmilayo Adeyemi", email: "f.adeyemi@greenfield.sch.ng" }, createdAt: ago(260 * DAY), lastActiveAt: ago(2 * 60_000) }),
      school({ id: "school-crestview", name: "Crestview Academy", city: "Wuse, Abuja", studentCount: 612, studentLimit: 800, scoresInShare: 0.83, admin: { fullName: "Yakubu Garba", email: "admin@crestview.edu.ng" }, createdAt: ago(380 * DAY), lastActiveAt: ago(60_000) }),
      school({ id: "school-kings", name: "Kings' Model School", city: "Enugu", planTier: "TRIAL", trialEndsAt: inDays(21), studentCount: 198, studentLimit: 300, scoresInShare: 0.22, admin: { fullName: "Chioma Nwankwo", email: "office@kingsmodel.sch.ng" }, createdAt: ago(9 * DAY), lastActiveAt: ago(HOUR) }),
      school({ id: "school-brightfuture", name: "Bright Future Secondary", city: "Ibadan", studentCount: 455, scoresInShare: 0.58, admin: { fullName: "Wale Adigun", email: "info@brightfuture.sch.ng" }, createdAt: ago(250 * DAY), lastActiveAt: ago(12 * 60_000) }),
      school({ id: "school-stanne", name: "St. Anne's Girls' School", city: "Owerri", planTier: "TRIAL", trialEndsAt: inDays(7), studentCount: 287, studentLimit: 300, scoresInShare: 0.64, admin: { fullName: "Mary Okeke", email: "stannes.owerri@gmail.com" }, createdAt: ago(23 * DAY), lastActiveAt: ago(3 * HOUR) }),
      school({ id: "school-hilltop", name: "Hilltop Secondary", city: "Jos", status: "SUSPENDED", studentCount: 240, scoresInShare: null, admin: { fullName: "Danladi Pam", email: "hilltopjos@yahoo.com" }, createdAt: ago(170 * DAY), lastActiveAt: ago(12 * DAY), suspendedReason: "Payment is overdue." }),
      school({ id: "school-alameen", name: "Al-Ameen Academy", city: "Kano", planTier: "BASIC", studentCount: 530, scoresInShare: 0.47, admin: { fullName: "Sani Bello", email: "alameen.kano@gmail.com" }, createdAt: ago(140 * DAY), lastActiveAt: ago(40 * 60_000) }),
      school({ id: "school-riverspearl", name: "Rivers Pearl College", city: "Port Harcourt", studentCount: 389, scoresInShare: 0.76, admin: { fullName: "Ibiere George", email: "admin@riverspearl.sch.ng" }, createdAt: ago(260 * DAY), lastActiveAt: ago(5 * 60_000) }),
    ],
    trials: [
      { id: "trial-unity", schoolName: "Unity Heights School", city: "Asaba", studentEstimate: 412, contactName: "Efe Okoro", contactRole: "Proprietor", email: "efe.okoro@unityheights.ng", phone: "0806 221 4410", message: "We still do results in Excel and it takes two weeks every term. We'd like to try it before our first term exams.", createdAt: ago(2 * HOUR), status: "NEW", callAt: null, schoolId: null },
      { id: "trial-graceland", schoolName: "Graceland Schools", city: "Abeokuta", studentEstimate: 268, contactName: "Kemi Sowole", contactRole: "Principal", email: "k.sowole@graceland.sch.ng", phone: "0703 118 9027", message: "Two campuses. Can each campus have its own admin?", createdAt: ago(DAY), status: "CALL_BOOKED", callAt: inDays(2), schoolId: null },
      { id: "trial-starlight", schoolName: "Starlight Academy", city: "Kaduna", studentEstimate: 505, contactName: "Idris Sule", contactRole: "Administrator", email: "idris.sule@starlight.edu.ng", phone: "0812 440 3391", message: "Our parents mostly use phones. Does the report card work on a phone?", createdAt: ago(3 * DAY), status: "NEW", callAt: null, schoolId: null },
    ],
    activity: [
      { id: "act-1", at: ago(40 * 60_000), kind: "PUBLISH", schoolId: "school-crestview", schoolName: "Crestview Academy", text: "Crestview Academy published JSS 3 results. 204 parents were emailed." },
      { id: "act-2", at: ago(70 * 60_000), kind: "INVITE", schoolId: "school-kings", schoolName: "Kings' Model School", text: "Kings' Model School invited 11 teachers." },
      { id: "act-3", at: ago(95 * 60_000), kind: "IMPORT", schoolId: "school-riverspearl", schoolName: "Rivers Pearl College", text: "Rivers Pearl College imported 389 students from a spreadsheet." },
      { id: "act-4", at: ago(2 * HOUR), kind: "TRIAL_REQUEST", schoolId: null, schoolName: "Unity Heights School", text: "Unity Heights School asked for a trial." },
      { id: "act-5", at: ago(DAY), kind: "SETTINGS", schoolId: "school-stanne", schoolName: "St. Anne's Girls' School", text: "St. Anne's Girls' School changed its grading scale." },
      { id: "act-6", at: ago(DAY + 5 * HOUR), kind: "BILLING", schoolId: "school-hilltop", schoolName: "Hilltop Secondary", text: "A payment reminder was sent to Hilltop Secondary." },
      { id: "act-7", at: ago(3 * DAY), kind: "PUBLISH", schoolId: "school-greenfield", schoolName: "Greenfield College", text: "Greenfield College published last term's catch-up results." },
    ],
  };
}

export function loadPlatform(): PlatformDb {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as PlatformDb;
  } catch {
    // Unreadable or blocked storage: start again from the seed.
  }
  const fresh = seed();
  savePlatform(fresh);
  return fresh;
}

export function savePlatform(db: PlatformDb) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Private browsing: changes last until the tab closes.
  }
}

/** For tests: forget saved changes so each test starts from the seed. */
export function resetPlatform() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing saved.
  }
}
