import { MARK_LABEL } from "@brillianda/core/attendance";
import { byCategory, formatNaira, listTotal } from "@brillianda/core/booklists";
import { ordinal } from "@brillianda/core/grading";
import Link from "next/link";
import { Badge } from "@brillianda/ui/Badge";
import { Card } from "@brillianda/ui/Cards";
import { Icon } from "@brillianda/ui/Icon";
import type { ParentChild } from "@/data/types";

const TONE = { present: "success", late: "warning", absent: "danger" } as const;
const dayLabel = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short" });

/** One child, as their parent sees them: who they are, and their attendance this term. */
export function ChildView({ child, reportHref }: { child: ParentChild; reportHref: string }) {
  const a = child.attendance;
  return (
    <div className="grid gap-4">
      {child.birthday && (
        <section aria-label="Birthday" className="flex items-start gap-4 rounded-[28px] p-5 shadow-raised sm:p-6" style={{ background: "var(--level-3-tint)", color: "var(--level-3-deep)" }}>
          <Icon name="cake" className="h-8 w-8 shrink-0" />
          <p className="text-[15px] font-medium leading-relaxed">{child.birthday}</p>
        </section>
      )}
      <section className="rounded-[28px] bg-surface p-5 shadow-raised sm:p-6">
        <h2 className="text-[22px] font-semibold tracking-[-0.02em]">{child.fullName}</h2>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-[12.5px] text-text-secondary">Class</dt>
            <dd className="font-medium">{child.armLabel}</dd>
          </div>
          <div>
            <dt className="text-[12.5px] text-text-secondary">Admission number</dt>
            <dd className="font-medium">{child.admissionNo}</dd>
          </div>
          <div>
            <dt className="text-[12.5px] text-text-secondary">Form teacher</dt>
            <dd className="font-medium">{child.formTeacher ?? "Not set yet"}</dd>
          </div>
        </dl>
      </section>

      <Card title="Results" description={child.results?.term}>
        {child.results?.published ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              Average <b className="text-[20px] font-semibold tabular-nums">{child.results.average ?? "—"}</b>
              {child.results.position ? (
                <>
                  {" "}· {ordinal(child.results.position)} of {child.results.of} in {child.armLabel}
                </>
              ) : null}
            </p>
            <Link href={reportHref} className="inline-flex min-h-[44px] items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-text hover:bg-primary-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
              Open the report card
            </Link>
          </div>
        ) : (
          <p className="text-sm text-text-secondary">{child.results ? "Results for this term aren’t out yet. The school publishes them when every subject is marked." : "Results come with the school term."}</p>
        )}
      </Card>

      {child.bookLists.map(({ label, list }) => {
        const total = listTotal(list.items);
        return (
          <Card key={`${list.levelId}-${list.startYear}`} title="Books and things needed" description={label}>
            <div className="grid gap-4">
              {byCategory(list.items).map((group) => (
                <div key={group.category}>
                  <h3 className="mb-1.5 text-[13px] font-semibold text-text-secondary">{group.label}</h3>
                  <ul className="grid gap-1">
                    {group.items.map((item) => (
                      <li key={item.id} className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="min-w-0">
                          <b className="font-medium">{item.name}</b>
                          {item.quantity > 1 && <span className="text-text-secondary"> × {item.quantity}</span>}
                          {item.detail && <span className="block text-[12.5px] text-text-secondary">{item.detail}</span>}
                        </span>
                        {item.price !== null && <span className="shrink-0 tabular-nums">{formatNaira(item.price * item.quantity)}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              {total.total > 0 && (
                <p className="flex justify-between gap-3 border-t border-border pt-3 text-sm font-semibold">
                  <span>Total{total.unpriced > 0 ? ` (${total.unpriced === 1 ? "1 item has" : `${total.unpriced} items have`} no price)` : ""}</span>
                  <span className="tabular-nums">{formatNaira(total.total)}</span>
                </p>
              )}
            </div>
          </Card>
        );
      })}

      {child.pastTerms.length > 0 && (
        <Card title="Earlier terms">
          <ul className="grid gap-1">
            {child.pastTerms.map((t) => (
              <li key={t.key}>
                <Link href={`${reportHref}?term=${t.key}`} className="block rounded-xl p-2.5 text-sm font-medium underline-offset-2 hover:bg-hover hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
                  {t.label}: report card
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card title="Attendance" description={a ? `${a.term}, from the class register. Late counts as present.` : "Shown during term time."}>
        {a && a.days > 0 ? (
          <>
            <dl className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-sunken p-3">
                <dt className="text-[12.5px] text-text-secondary">Present</dt>
                <dd className="text-[22px] font-medium tabular-nums">
                  {a.present}
                  <span className="text-sm text-text-secondary"> of {a.days}</span>
                </dd>
              </div>
              <div className="rounded-2xl bg-sunken p-3">
                <dt className="text-[12.5px] text-text-secondary">Late</dt>
                <dd className="text-[22px] font-medium tabular-nums">{a.late}</dd>
              </div>
              <div className="rounded-2xl bg-sunken p-3">
                <dt className="text-[12.5px] text-text-secondary">Absent</dt>
                <dd className="text-[22px] font-medium tabular-nums">{a.absent}</dd>
              </div>
            </dl>
            <h3 className="mt-5 text-sm font-semibold">Recent school days</h3>
            <ul className="mt-2 grid gap-1">
              {child.recent.map((day) => (
                <li key={day.date} className="flex items-center justify-between gap-3 rounded-xl px-1 py-1.5 text-sm">
                  <span>{dayLabel(day.date)}</span>
                  {day.mark ? <Badge tone={TONE[day.mark]}>{MARK_LABEL[day.mark]}</Badge> : <span className="text-[13px] text-text-secondary">Not taken yet</span>}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-text-secondary">No registers taken for {child.fullName.split(" ")[0]} this term yet.</p>
        )}
      </Card>
    </div>
  );
}
