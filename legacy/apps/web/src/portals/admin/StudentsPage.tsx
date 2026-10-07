import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { AdminStudent } from "@brillanda/shared-types";
import { Alert } from "../../shared/components/Alert";
import { Badge } from "../../shared/components/Badge";
import { Button } from "../../shared/components/Button";
import { EmptyState } from "../../shared/components/EmptyState";
import { Icon } from "../../shared/components/Icon";
import { PageHeader } from "../../shared/components/PageHeader";
import { PageSpinner } from "../../shared/components/Spinner";
import { FilterTabs } from "../../shared/components/Tabs";
import { levelStyle } from "../../shared/theme/levels";
import { cx } from "../../shared/utils/cx";
import { plural } from "../../shared/utils/time";
import { SECTIONS, useStudents } from "./api";
import { EnrolDialog, InviteParentDialog, LEFT_LABEL } from "./enrolment";
import { ParentBadge } from "./parts";

type Show = "current" | "left";
const initialsOf = (fullName: string) => fullName.split(" ").map((w) => w[0]).join("").slice(0, 2);

export function StudentsPage() {
  const students = useStudents();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [inviting, setInviting] = useState<Pick<AdminStudent, "id" | "fullName"> | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const unlinkedOnly = params.get("unlinked") === "1";
  const show: Show = params.get("show") === "left" ? "left" : "current";
  const setParam = (key: string, value: string | null) =>
    setParams((prev) => { const next = new URLSearchParams(prev); if (value) next.set(key, value); else next.delete(key); return next; }, { replace: true });

  if (students.isPending) return <PageSpinner />;
  if (students.error) return <Alert tone="danger">{students.error.message}</Alert>;

  const current = students.data.filter((s) => s.status === "ACTIVE");
  const former = students.data.filter((s) => s.status !== "ACTIVE");
  const words = query.trim().toLowerCase();
  const matchesWords = (s: AdminStudent) => !words || s.fullName.toLowerCase().includes(words) || s.admissionNo.toLowerCase().includes(words);
  const armOrder = [...new Map(current.map((s) => [s.armId, s])).values()].sort((a, b) => a.classOrder - b.classOrder || a.armName.localeCompare(b.armName));
  const withoutParent = current.filter((s) => s.parentStatus !== "LINKED").length;

  const enrolButton = (
    <>
      <Link to="/admin/students/import" className="inline-flex min-h-[42px] items-center gap-2 rounded-full bg-raise px-5 text-sm font-medium shadow-raised hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <Icon name="upload" className="h-4 w-4" />
        Import a list
      </Link>
      <Button onClick={() => setEnrolling(true)}>
        <Icon name="plus" className="h-4 w-4" />
        Enrol a student
      </Button>
    </>
  );
  const overlays = (
    <>
      <EnrolDialog open={enrolling} onClose={() => setEnrolling(false)} />
      <InviteParentDialog student={inviting} onClose={() => setInviting(null)} />
    </>
  );

  if (!students.data.length) {
    return (
      <>
        <PageHeader title="Students" actions={enrolButton}>Nobody is enrolled yet.</PageHeader>
        <EmptyState title="Enrol your first students">
          Import your list from a spreadsheet, or add students one at a time. Each gets the next admission number in your school's format.
          <span className="mt-4 flex flex-wrap justify-center gap-2">{enrolButton}</span>
        </EmptyState>
        {overlays}
      </>
    );
  }

  return (
    <>
      <PageHeader title="Students" actions={enrolButton}>
        {plural(current.length, "student")} in {plural(armOrder.length, "class", "classes")}.{" "}
        {withoutParent ? `${withoutParent} still need a parent linked before they can see results.` : "Every student has a parent linked."}
      </PageHeader>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <FilterTabs
          label="Show"
          value={show}
          onChange={(value) => setParam("show", value === "left" ? "left" : null)}
          items={[{ value: "current", label: "Current", count: current.length }, { value: "left", label: "Left the school", count: former.length }]}
        />
        <label className="relative w-full max-w-sm">
          <span className="sr-only">Search students</span>
          <Icon name="search" className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-text-muted" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or admission number" className="min-h-[46px] w-full rounded-full border-0 bg-raise pl-11 pr-4 text-base shadow-raised focus:outline-none focus:ring-2 focus:ring-accent" />
        </label>
        {show === "current" && (
          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input type="checkbox" className="h-[18px] w-[18px] accent-[var(--color-accent)]" checked={unlinkedOnly} onChange={(e) => setParam("unlinked", e.target.checked ? "1" : null)} />
            No parent linked
          </label>
        )}
      </div>

      {show === "current" ? (
        <CurrentStudents
          students={current.filter((s) => matchesWords(s) && (!unlinkedOnly || s.parentStatus !== "LINKED"))}
          armOrder={armOrder}
          filtering={!!words || unlinkedOnly}
          emptyText={words ? `Nobody called or numbered “${query.trim()}”. Check the spelling.` : "Every student has a parent linked."}
          open={open}
          setOpen={setOpen}
          onInvite={setInviting}
        />
      ) : (
        <FormerStudents students={former.filter(matchesWords)} searching={!!words} />
      )}

      {overlays}
    </>
  );
}

function CurrentStudents({ students, armOrder, filtering, emptyText, open, setOpen, onInvite }: {
  students: AdminStudent[];
  armOrder: AdminStudent[];
  filtering: boolean;
  emptyText: string;
  open: Set<string>;
  setOpen: (next: Set<string>) => void;
  onInvite: (student: AdminStudent) => void;
}) {
  const toggle = (armId: string) => { const next = new Set(open); if (next.has(armId)) next.delete(armId); else next.add(armId); setOpen(next); };
  const sections = SECTIONS.map((section) => {
    const groups = armOrder
      .filter((a) => (section.orders as readonly number[]).includes(a.classOrder))
      .map((a) => ({ armId: a.armId, armName: a.armName, classOrder: a.classOrder, list: students.filter((s) => s.armId === a.armId) }))
      .filter((g) => g.list.length);
    return { section, groups, count: groups.reduce((n, g) => n + g.list.length, 0) };
  }).filter((s) => s.groups.length);

  if (!sections.length) return <EmptyState title="No students match">{emptyText}</EmptyState>;

  return (
    <div className="grid gap-6">
      {!filtering && (
        <button type="button" className="-mb-3 justify-self-end text-[13.5px] font-medium text-accent hover:underline" onClick={() => setOpen(open.size ? new Set() : new Set(armOrder.map((a) => a.armId)))}>
          {open.size ? "Collapse all" : "Expand all"}
        </button>
      )}
      {sections.map(({ section, groups, count }) => (
        <section key={section.id} className="grid gap-2.5">
          <div className="flex items-baseline justify-between gap-3 px-1.5">
            <h2 className="text-[21px] font-medium tracking-[-0.025em]">{section.name}</h2>
            <span className="text-[13px] text-text-secondary">
              {filtering ? `${plural(count, "match", "matches")} in ${plural(groups.length, "class", "classes")}` : `${count} students, ${plural(groups.length, "class", "classes")}`}
            </span>
          </div>
          {groups.map((group, i) => {
            const isOpen = filtering || open.has(group.armId);
            const noParent = group.list.filter((s) => s.parentStatus !== "LINKED").length;
            const level = levelStyle(group.classOrder);
            return (
              <div key={group.armId} className={cx("animate-pop overflow-hidden rounded-[22px] bg-surface transition-shadow", isOpen ? "shadow-float" : "shadow-raised")} style={{ ...level, ["--d" as string]: `${i * 0.03}s` }}>
                <button type="button" aria-expanded={isOpen} onClick={() => toggle(group.armId)} className="grid w-full grid-cols-[46px_minmax(0,1fr)_34px] items-center gap-3.5 px-4 py-3.5 text-left hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:grid-cols-[46px_minmax(0,1fr)_auto_34px]">
                  <span aria-hidden className="grid h-[46px] w-[46px] place-items-center rounded-[15px] text-sm font-semibold" style={{ background: "var(--tint)", color: "var(--deep)" }}>
                    {group.armName.replace(/^\s*(JSS|SS)\s*/i, "")}
                  </span>
                  <span className="min-w-0">
                    <b className="block text-[15.5px] font-semibold">{group.armName}</b>
                    <span className="text-[13px] text-text-secondary">{plural(group.list.length, "student")}{noParent ? `, ${noParent} without a parent` : ""}</span>
                  </span>
                  <span aria-hidden className="hidden pl-2 sm:flex">
                    {group.list.slice(0, 4).map((s) => (
                      <i key={s.id} className="-ml-2 grid h-[30px] w-[30px] place-items-center rounded-full text-[11px] font-semibold not-italic shadow-[0_0_0_2.5px_var(--color-surface)]" style={{ background: "var(--tint)", color: "var(--deep)" }}>{s.fullName[0]}</i>
                    ))}
                    {group.list.length > 4 && <i className="-ml-2 grid h-[30px] min-w-[30px] place-items-center rounded-full bg-sunken px-1 text-[10.5px] font-semibold not-italic text-text-secondary shadow-[0_0_0_2.5px_var(--color-surface)]">+{group.list.length - 4}</i>}
                  </span>
                  <span aria-hidden className={cx("grid h-[34px] w-[34px] place-items-center rounded-full transition-colors", isOpen ? "bg-primary text-primary-text" : "bg-sunken")}>
                    <Icon name="chevron" className={cx("h-4 w-4 transition-transform duration-300", isOpen && "rotate-90")} />
                  </span>
                </button>
                {isOpen && (
                  <ul className="grid animate-pop gap-0.5 border-t border-divider p-2">
                    {group.list.map((s) => (
                      <li key={s.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl hover:bg-hover sm:grid-cols-[minmax(0,1fr)_auto_auto]">
                        <Link to={`/admin/students/${encodeURIComponent(s.id)}`} className="grid min-w-0 grid-cols-[2.4rem_minmax(0,1fr)] items-center gap-3 rounded-2xl p-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
                          <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full text-xs font-semibold" style={{ background: "var(--tint)", color: "var(--deep)" }}>{initialsOf(s.fullName)}</span>
                          <span className="min-w-0"><b className="block truncate font-medium">{s.fullName}</b><span className="text-[12.5px] text-text-secondary">{s.admissionNo}</span></span>
                        </Link>
                        <span className="hidden sm:block"><ParentBadge status={s.parentStatus} /></span>
                        <span className="flex justify-end pr-2">
                          {s.parentStatus === "NONE" && (
                            <Button size="sm" variant="secondary" onClick={() => onInvite(s)}>
                              <Icon name="mail" className="h-4 w-4" />
                              Invite parent
                            </Button>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}

/** Students who have left, most recent first. Their records and results stay. */
function FormerStudents({ students, searching }: { students: AdminStudent[]; searching: boolean }) {
  if (!students.length) {
    return <EmptyState title={searching ? "No students match" : "Nobody has left"}>{searching ? "Check the spelling." : "Students you mark as withdrawn, transferred or graduated appear here, with their records and results."}</EmptyState>;
  }
  return (
    <ul className="grid gap-2">
      {students.map((s) => (
        <li key={s.id}>
          <Link to={`/admin/students/${encodeURIComponent(s.id)}`} className="grid w-full grid-cols-[2.4rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[20px] bg-surface p-3 text-left shadow-raised hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            <span aria-hidden className="grid h-9 w-9 place-items-center rounded-full bg-sunken text-xs font-semibold text-text-secondary">{initialsOf(s.fullName)}</span>
            <span className="min-w-0">
              <b className="block truncate font-medium">{s.fullName}</b>
              <span className="text-[12.5px] text-text-secondary">{s.admissionNo}, last in {s.armName}</span>
            </span>
            {s.status !== "ACTIVE" && <Badge tone="neutral">{LEFT_LABEL[s.status].title}</Badge>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

