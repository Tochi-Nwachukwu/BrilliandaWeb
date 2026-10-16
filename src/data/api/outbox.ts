// STAGING ONLY: the API keeps every email it sends in an outbox for 7 days, because its email
// provider can only reach the backend team until a sending domain is verified (their
// frontend-auth guide, "Testing on staging"). Until then, screens that send an email show what the
// email said (its link or code), the way the sample data's screens do.
//
// Switched on by MAIL_OUTBOX_KEY together with API_ROOT_DOMAIN (staging); never in production.
// Staging must hold test accounts only: anyone who types an email here sees that email's link.
import "server-only";
import type { SampleEmail } from "../types";

type OutboxEmail = { id: string; to: string; tag: string; subject: string; sentAt: string; delivered: boolean | null; code: string | null; links: string[]; text: string };

export function outboxOn(): boolean {
  return Boolean(process.env.MAIL_OUTBOX_KEY && process.env.API_ROOT_DOMAIN && process.env.API_URL && process.env.API_PROXY_SECRET);
}

async function fetchEmails(to: string): Promise<OutboxEmail[]> {
  const url = new URL("/v1/dev/outbox", process.env.API_URL);
  url.searchParams.set("to", to);
  url.searchParams.set("limit", "5");
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        "x-brillianda-outbox-key": process.env.MAIL_OUTBOX_KEY!,
        "x-brillianda-proxy-secret": process.env.API_PROXY_SECRET!,
        "x-forwarded-host": process.env.API_ROOT_DOMAIN!,
        "x-forwarded-proto": "https",
      },
    });
    if (!res.ok) return [];
    return ((await res.json()) as { emails?: OutboxEmail[] }).emails ?? [];
  } catch {
    return [];
  }
}

/**
 * The newest email to `to` sent since `since` (ms), waiting briefly for it to arrive. Null when
 * the outbox is off or nothing came.
 */
export async function latestEmail(to: string, since: number): Promise<OutboxEmail | null> {
  if (!outboxOn()) return null;
  for (let i = 0; i < 4; i++) {
    // Allow a little clock difference between us and the API.
    const found = (await fetchEmails(to)).find((e) => Date.parse(e.sentAt) >= since - 5000);
    if (found) return found;
    await new Promise((resolve) => setTimeout(resolve, 600));
  }
  return null;
}

/** The email's links as links on our own pages: the API writes them for the staging app's address. */
function ours(link: string): string {
  try {
    const u = new URL(link);
    return `${u.pathname}${u.search}`;
  } catch {
    return link;
  }
}

/** What a screen shows for an email it just sent: its links (and code), from the outbox. */
export async function outboxSample(to: string, since: number): Promise<SampleEmail> {
  const email = await latestEmail(to, since);
  if (!email) return {};
  return {
    sampleLinks: [
      ...(email.code ? [{ label: "The code:", href: "", code: email.code, fromOutbox: true }] : []),
      ...email.links.map((l, i) => ({ label: email.links.length > 1 ? `Open link ${i + 1}: ${email.subject}` : `Open the link: ${email.subject}`, href: ours(l), fromOutbox: true })),
    ],
  };
}

/** The 6-digit code in the newest signup email to `to`, for the code screen. */
export async function latestCode(to: string): Promise<string | null> {
  if (!outboxOn()) return null;
  const emails = await fetchEmails(to);
  return emails.find((e) => e.code)?.code ?? null;
}
