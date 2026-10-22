import { schoolBaseOf } from "@/lib/schoolBase";

// The backend's emails link here, with the token in the query (their docs/frontend-integration.md).
// Our page keeps the token in the path, so this forwards to it.
export async function GET(request: Request, { params }: RouteContext<"/s/[school]/auth/magic">) {
  const { school } = await params;
  const token = new URL(request.url).searchParams.get("token");
  const base = schoolBaseOf(request, school);
  const to = token ? `${base}/magic/${encodeURIComponent(token)}` : `${base}/magic-link`;
  // A bare path: the browser stays on whichever address it came in on (the school's own, or localhost).
  return new Response(null, { status: 307, headers: { location: to, "cache-control": "no-store" } });
}
