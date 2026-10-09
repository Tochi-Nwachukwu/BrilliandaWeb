import type { ChangeFilter } from "@/data/types";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** The history's filters from its address (?who=&q=&from=&to=&student=&show=), ignoring junk. */
export function filterFrom(params: Record<string, string | string[] | undefined>): ChangeFilter & { show: number } {
  const one = (key: string) => {
    const v = params[key];
    return (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
  };
  const from = one("from");
  const to = one("to");
  const show = Number(one("show"));
  return {
    who: one("who"),
    search: one("q"),
    from: from && DAY.test(from) ? from : undefined,
    to: to && DAY.test(to) ? to : undefined,
    studentId: one("student"),
    show: Number.isInteger(show) && show > 0 ? Math.min(show, 1000) : 50,
  };
}
