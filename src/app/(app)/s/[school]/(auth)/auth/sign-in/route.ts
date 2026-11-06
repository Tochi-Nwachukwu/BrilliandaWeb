import { signIn } from "@/data/actions/auth";
import { schoolBaseOf } from "@/lib/schoolBase";

// The sign-in form on the main site (brillianda.com/login) posts here, on the school's own address,
// so the session is made for that address. Success goes to the school's home; a failure goes to
// the school's sign-in page with the message and the email filled in.
export async function POST(request: Request, { params }: RouteContext<"/s/[school]/auth/sign-in">) {
  const { school } = await params;
  // Only our own pages may post here: the school's address, or the main site above it.
  const host = (request.headers.get("host") ?? "").replace(/:\d+$/, "").toLowerCase();
  const origin = request.headers.get("origin");
  const from = origin ? new URL(origin).hostname.toLowerCase() : null;
  if (from && from !== host && !host.endsWith(`.${from}`)) return new Response("Not allowed", { status: 403 });

  const form = await request.formData();
  const email = String(form.get("email") ?? "").slice(0, 254);
  const password = String(form.get("password") ?? "").slice(0, 128);
  const base = schoolBaseOf(request, school);
  const result = await signIn(school, { email, password });
  const to = result.ok ? base || "/" : `${base}/login?${new URLSearchParams({ email, error: result.error })}`;
  return new Response(null, { status: 303, headers: { location: to, "cache-control": "no-store" } });
}
