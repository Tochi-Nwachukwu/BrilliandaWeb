import { toCsv } from "@brillianda/core/students";
import { listChanges } from "@/data/changes";
import { filterFrom } from "../filters";

// The change history as a spreadsheet, with the same filters as the page. Cells are escaped so a
// spreadsheet never runs one as a formula (plan: safeguards).
export async function GET(request: Request, { params }: RouteContext<"/s/[school]/more/history/export">) {
  const { school } = await params;
  const filter = filterFrom(Object.fromEntries(new URL(request.url).searchParams));
  const log = await listChanges(school, { ...filter, limit: 1000 });
  if (!log) return new Response("Sign in first.", { status: 403 });
  const when = (at: number) => new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", dateStyle: "short", timeStyle: "short" }).format(at);
  const csv = toCsv(
    ["When (Lagos time)", "Who", "What", "Student"],
    log.entries.map((e) => [when(e.at), e.who, e.what, e.student?.name ?? ""]),
  );
  const day = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${school}-changes-${day}.csv"`,
      "cache-control": "no-store",
    },
  });
}
