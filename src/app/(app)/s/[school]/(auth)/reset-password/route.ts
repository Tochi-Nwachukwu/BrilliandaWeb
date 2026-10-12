// The backend's emails link here, with the token in the query (their docs/frontend-integration.md).
// Our page keeps the token in the path, so this forwards to it.
export async function GET(request: Request, { params }: RouteContext<"/s/[school]/reset-password">) {
  const { school } = await params;
  const token = new URL(request.url).searchParams.get("token");
  const to = token ? `/s/${school}/reset-password/${encodeURIComponent(token)}` : `/s/${school}/forgot-password`;
  // A bare path: the browser stays on whichever address it came in on (the school's own, or localhost).
  return new Response(null, { status: 307, headers: { location: to, "cache-control": "no-store" } });
}
