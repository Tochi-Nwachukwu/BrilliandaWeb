// Dates and times as people in Nigerian schools read them, in Lagos time whatever the server's zone.

const ZONE = "Africa/Lagos";

/** "2026-10-07": today's date in Lagos. */
export function todayInLagos(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** "Wednesday 7 October" */
export function formatDay(date: Date): string {
  return date.toLocaleDateString("en-GB", { timeZone: ZONE, weekday: "long", day: "numeric", month: "long" });
}

/** "14 September 2026", from an ISO day. */
export function formatDate(isoDay: string): string {
  return new Date(`${isoDay}T12:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
}

/** "14 Sep", from an ISO day. */
export function formatShortDate(isoDay: string): string {
  return new Date(`${isoDay}T12:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short" });
}

export function greeting(now = new Date()): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: ZONE, hour: "numeric", hourCycle: "h23" }).format(now));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** "just now", "5 minutes ago", "3 hours ago", "yesterday", "9 days ago" */
export function timeAgo(at: number, now: number): string {
  const minutes = Math.round((now - at) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
