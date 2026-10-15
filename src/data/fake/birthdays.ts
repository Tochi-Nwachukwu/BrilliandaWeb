// FAKE: birthday messages (batch 19) on sample data. The backend replaces this with stored settings
// and a daily job at 7:00 am Lagos time that texts each birthday child's guardian once, through an
// SMS provider, and keeps a log. Here the "job" runs whenever the birthdays are read.
import "server-only";
import { birthdayMessage, type BirthdaySettings, DEFAULT_BIRTHDAY_MESSAGE, isBirthday, ageOn, upcomingBirthdays } from "@brillianda/core/birthdays";
import { todayInLagos } from "@/lib/time";
import type { ActionResult, BirthdayRow, BirthdaysPage, BirthdaysThisWeek } from "../types";
import { requireMember } from "./auth";
import { recordChange } from "./changes";
import { store } from "./store";
import { armOptions } from "./students";

const settingsOf = (subdomain: string) => store.birthdaySettings.get(subdomain) ?? { enabled: false, message: DEFAULT_BIRTHDAY_MESSAGE };
const schoolName = (subdomain: string) => store.schools.find((s) => s.subdomain === subdomain)?.name ?? "";
const activeStudents = (subdomain: string) => store.students.filter((s) => s.subdomain === subdomain && !s.deletedAt && s.status === "active");
const phoneOf = (guardianId: string | null) => store.guardians.find((g) => g.id === guardianId)?.phone ?? null;

/** The day's texts, once per child: what the real daily job does at 7:00 am. */
function sendTodays(subdomain: string) {
  const settings = settingsOf(subdomain);
  if (!settings.enabled) return;
  const today = todayInLagos();
  for (const s of activeStudents(subdomain)) {
    if (!isBirthday(s.dateOfBirth, today)) continue;
    if (store.birthdayLog.some((l) => l.studentId === s.id && l.date === today)) continue;
    store.birthdayLog.push({
      id: crypto.randomUUID(),
      subdomain,
      studentId: s.id,
      date: today,
      to: phoneOf(s.guardianId),
      text: birthdayMessage(settings.message, { firstName: s.firstName, age: ageOn(s.dateOfBirth, today) }, schoolName(subdomain)),
    });
  }
}

function rows(subdomain: string, days: number): BirthdayRow[] {
  const labels = new Map(armOptions(subdomain).map((a) => [a.id, a.label]));
  return upcomingBirthdays(activeStudents(subdomain), todayInLagos(), days).map((s) => ({
    studentId: s.id,
    fullName: [s.firstName, s.otherNames, s.lastName].filter(Boolean).join(" "),
    armLabel: labels.get(s.armId) ?? "No class",
    on: s.on,
    inDays: s.inDays,
    turns: s.turns,
    guardianPhone: phoneOf(s.guardianId),
  }));
}

export async function getBirthdays(subdomain: string): Promise<BirthdaysPage | null> {
  if (!(await requireMember(subdomain))) return null;
  sendTodays(subdomain);
  const labels = new Map(armOptions(subdomain).map((a) => [a.id, a.label]));
  const sent = store.birthdayLog
    .filter((l) => l.subdomain === subdomain)
    .slice(-20)
    .reverse()
    .map((l) => {
      const s = store.students.find((x) => x.id === l.studentId);
      return { id: l.id, date: l.date, fullName: s ? `${s.firstName} ${s.lastName}` : "A student", armLabel: (s && labels.get(s.armId)) ?? "", to: l.to, text: l.text };
    });
  return { settings: settingsOf(subdomain), schoolName: schoolName(subdomain), today: todayInLagos(), upcoming: rows(subdomain, 30), sent };
}

export async function getBirthdaysThisWeek(subdomain: string): Promise<BirthdaysThisWeek | null> {
  if (!(await requireMember(subdomain))) return null;
  sendTodays(subdomain);
  return { enabled: settingsOf(subdomain).enabled, rows: rows(subdomain, 7) };
}

export async function saveBirthdaySettings(subdomain: string, input: BirthdaySettings): Promise<ActionResult<null>> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const who = await requireMember(subdomain);
  if (!who) return { ok: false, error: "Only the school’s owner and admins can do this." };
  const before = settingsOf(subdomain);
  store.birthdaySettings.set(subdomain, input);
  if (before.enabled !== input.enabled) recordChange(subdomain, who.fullName, input.enabled ? "Turned birthday messages on" : "Turned birthday messages off");
  else if (before.message !== input.message) recordChange(subdomain, who.fullName, "Changed the birthday message");
  return { ok: true, data: null };
}

/** For the parent app: the school's message, on the child's birthday, when the school sends them. */
export function birthdayFor(subdomain: string, studentId: string): string | null {
  const settings = settingsOf(subdomain);
  const s = store.students.find((x) => x.id === studentId);
  const today = todayInLagos();
  if (!settings.enabled || !s || !isBirthday(s.dateOfBirth, today)) return null;
  return birthdayMessage(settings.message, { firstName: s.firstName, age: ageOn(s.dateOfBirth, today) }, schoolName(subdomain));
}
