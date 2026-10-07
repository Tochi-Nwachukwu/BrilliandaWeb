import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { ArmSummary, ParentStatus, PersonRef } from "@brillanda/shared-types";
import { generalError } from "../../shared/auth/LoginPage";
import { Alert } from "../../shared/components/Alert";
import { Badge } from "../../shared/components/Badge";
import { Button } from "../../shared/components/Button";
import { Icon } from "../../shared/components/Icon";
import { Dialog } from "../../shared/components/Overlay";
import { PageSpinner } from "../../shared/components/Spinner";
import { ReportCardView } from "../../shared/components/ReportCardView";
import { toast } from "../../shared/components/Toast";
import { levelStyle } from "../../shared/theme/levels";
import { plural } from "../../shared/utils/time";
import { isDone, useReportCard, useSendReminders } from "./api";

/** Where a class stands, for filters and its status line. */
export type ArmCategory = "PUBLISHED" | "READY" | "ATTENTION" | "PROGRESS";
export const armCategory = (arm: ArmSummary): ArmCategory =>
  arm.publishStatus === "PUBLISHED" ? "PUBLISHED" : arm.publishStatus === "COMPLETE" ? "READY" : arm.pendingUnlockRequests ? "ATTENTION" : "PROGRESS";
export const CATEGORY_LABEL: Record<ArmCategory, string> = { PUBLISHED: "Published", READY: "Ready", ATTENTION: "Needs you", PROGRESS: "In progress" };
const CATEGORY_DOT: Record<ArmCategory, string> = { PUBLISHED: "bg-text-primary", READY: "bg-success", ATTENTION: "bg-danger", PROGRESS: "bg-warning" };

export const subjectsDone = (arm: ArmSummary) => arm.subjects.filter((s) => isDone(s.status)).length;

const WAVE = "M0 10 Q25 0 50 10 T100 10 T150 10 T200 10 T250 10 T300 10 T350 10 T400 10 V20 H0Z";

/** A class as a calm white card; its colour rises like liquid to the share of subjects complete. */
export function ArmCard({ arm, index, compact = false }: { arm: ArmSummary; index: number; compact?: boolean }) {
  const done = subjectsDone(arm);
  const share = done / Math.max(1, arm.subjects.length);
  const category = armCategory(arm);
  return (
    <Link
      to={`/admin/classes/${arm.id}`}
      className="group relative isolate grid animate-pop content-start gap-4 overflow-hidden rounded-[26px] bg-surface p-[22px] shadow-raised transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      style={{ ...levelStyle(arm.classOrder), minHeight: compact ? 186 : 208, ["--d" as string]: `${index * 0.03}s` }}
      aria-label={`${arm.name}, ${done} of ${arm.subjects.length} subjects, ${CATEGORY_LABEL[category]}`}
    >
      <span className="relative z-10 flex items-center justify-between gap-2">
        {!compact && (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-semibold" style={{ background: "var(--tint)", color: "var(--deep)" }}>
            <span aria-hidden className="h-[7px] w-[7px] rounded-full" style={{ background: "var(--mid)" }} />
            {arm.className}
          </span>
        )}
        <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-text-secondary">
          <span aria-hidden className={`h-[7px] w-[7px] rounded-full ${CATEGORY_DOT[category]}`} />
          {CATEGORY_LABEL[category]}
        </span>
      </span>
      <span className="relative z-10 text-[34px] font-medium leading-none tracking-[-0.04em]">{arm.name}</span>
      <span className="relative z-10 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-[13px] text-text-secondary">
        <span aria-hidden className="relative block h-1.5 overflow-hidden rounded-full bg-[color-mix(in_oklab,var(--color-text-primary)_7%,transparent)]">
          <span className="absolute inset-y-0 left-0 animate-grow rounded-full" style={{ width: `${share * 100}%`, background: "var(--mid)" }} />
        </span>
        <span className="tabular-nums">
          {done}/{arm.subjects.length}
        </span>
      </span>
      <span className="relative z-10 mt-auto flex items-center justify-between text-[13px] text-text-secondary">
        {plural(arm.studentCount, "student")}
        <span aria-hidden className="grid h-8 w-8 -translate-x-1.5 place-items-center rounded-full bg-raise text-text-primary opacity-0 shadow-raised transition-[opacity,transform] duration-300 group-hover:translate-x-0 group-hover:opacity-100">
          <Icon name="chevron" className="h-4 w-4" />
        </span>
      </span>
      <span aria-hidden className="liquid" style={{ ["--p" as string]: (0.08 + share * 0.44).toFixed(3) }}>
        <svg viewBox="0 0 400 20" preserveAspectRatio="none"><path d={WAVE} /></svg>
        <svg viewBox="0 0 400 20" preserveAspectRatio="none"><path d={WAVE} /></svg>
      </span>
    </Link>
  );
}

export function ParentBadge({ status }: { status: ParentStatus }) {
  if (status === "LINKED") return <Badge tone="success">Linked</Badge>;
  if (status === "INVITED") return <Badge tone="info">Invite sent</Badge>;
  return <Badge tone="warning">Not linked</Badge>;
}

/** Choose which teachers to nudge, add a note, send. They get an email and a note on their home. */
export function RemindDialog({ teachers, open, onClose }: { teachers: { teacher: PersonRef; sheets: number }[]; open: boolean; onClose: () => void }) {
  if (!open) return null;
  return <RemindForm key={teachers.map((t) => t.teacher.id).join()} teachers={teachers} onClose={onClose} />;
}

function RemindForm({ teachers, onClose }: { teachers: { teacher: PersonRef; sheets: number }[]; onClose: () => void }) {
  const [chosen, setChosen] = useState(() => new Set(teachers.map((t) => t.teacher.id)));
  const [note, setNote] = useState("");
  const send = useSendReminders();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    send.mutate(
      { teacherIds: [...chosen], note: note.trim() || undefined },
      { onSuccess: ({ sent }) => { toast(`Reminders sent to ${plural(sent, "teacher")}`); onClose(); } },
    );
  };

  return (
    <Dialog open onClose={onClose} title={teachers.length === 1 ? `Remind ${teachers[0]!.teacher.fullName}` : "Remind teachers"} description="They'll get an email and a note on their home screen.">
      <form onSubmit={submit} className="grid gap-4" noValidate>
        {teachers.length > 1 && (
          <ul className="grid gap-0.5 rounded-[18px] bg-surface p-2">
            {teachers.map(({ teacher, sheets }) => (
              <li key={teacher.id}>
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl px-2.5 py-2 text-sm hover:bg-hover">
                  <span className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="h-[18px] w-[18px] accent-[var(--color-accent)]"
                      checked={chosen.has(teacher.id)}
                      onChange={(e) => setChosen((prev) => { const next = new Set(prev); if (e.target.checked) next.add(teacher.id); else next.delete(teacher.id); return next; })}
                    />
                    {teacher.fullName}
                  </span>
                  <span className="text-text-secondary">{plural(sheets, "sheet")} behind</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        <label className="grid gap-1.5 text-sm font-medium">
          Add a note (optional)
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            data-autofocus={teachers.length === 1 || undefined}
            placeholder="Please finish by Friday so we can publish before the holiday."
            className="rounded-[14px] border-0 bg-sunken px-4 py-3 text-base font-normal placeholder:text-text-muted focus:bg-surface focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        {send.error && <Alert tone="danger">{generalError(send.error)}</Alert>}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={!chosen.size} loading={send.isPending}>
            <Icon name="mail" className="h-4 w-4" />
            Send {chosen.size > 1 ? `${chosen.size} reminders` : "reminder"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/** What a parent receives: the report card, laid out like the printed one. */
export function ReportCardDialog({ studentId, onClose }: { studentId: string | null; onClose: () => void }) {
  const card = useReportCard(studentId);
  if (!studentId) return null;
  return (
    <Dialog open onClose={onClose} width={880} title="Report card" description={card.data ? `${card.data.student.fullName}, ${card.data.term.name} ${card.data.term.sessionName}` : undefined}>
      {card.isPending ? (
        <PageSpinner />
      ) : card.error ? (
        <Alert tone="danger">{card.error.message}</Alert>
      ) : (
        <ReportCardView card={card.data} />
      )}
    </Dialog>
  );
}

/** Sheets complete week by week: one line that draws itself, with the latest figure labelled. */
export function WeeklyChart({ weeks, max }: { weeks: number[]; max: number }) {
  const W = 440, H = 190, pl = 30, pr = 14, pt = 22, pb = 26;
  if (weeks.length < 2) return <p className="text-sm text-text-secondary">The chart fills in from week 2.</p>;
  const x = (i: number) => pl + (i * (W - pl - pr)) / (weeks.length - 1);
  const y = (v: number) => pt + (1 - v / Math.max(1, max)) * (H - pt - pb);
  const line = weeks.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const last = weeks.length - 1;
  const ticks = [0, Math.round(max / 3), Math.round((2 * max) / 3), max];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-visible" role="img" aria-label={`Sheets complete by week: ${weeks.map((v, i) => `week ${i + 1}, ${v}`).join("; ")}`}>
      <defs>
        <linearGradient id="weekly-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--color-chart)", stopOpacity: 0.26 }} />
          <stop offset="1" style={{ stopColor: "var(--color-chart)", stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pl} x2={W - pr} y1={y(t)} y2={y(t)} style={{ stroke: "var(--color-divider)" }} />
          <text x={pl - 8} y={y(t) + 4} textAnchor="end" className="fill-text-muted text-[11.5px]">{t}</text>
        </g>
      ))}
      <path d={`${line} L${x(last)} ${H - pb} L${x(0)} ${H - pb} Z`} fill="url(#weekly-fill)" />
      <path d={line} fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" pathLength={1} className="[stroke-dasharray:1] [stroke-dashoffset:1] animate-[draw-line_1.5s_cubic-bezier(0.2,0.8,0.2,1)_200ms_forwards]" style={{ stroke: "var(--color-chart)" }} />
      {[0, Math.floor(last / 2), last].map((i) => (
        <text key={i} x={x(i)} y={H - 6} textAnchor="middle" className="fill-text-muted text-[11.5px]">Wk {i + 1}</text>
      ))}
      <circle cx={x(last)} cy={y(weeks[last]!)} r={5.5} strokeWidth={2.5} style={{ fill: "var(--color-chart)", stroke: "var(--color-surface)" }} />
      <text x={x(last) - 10} y={y(weeks[last]!) - 12} textAnchor="end" className="fill-text-primary text-[12.5px] font-semibold">{weeks[last]} of {max}</text>
    </svg>
  );
}
