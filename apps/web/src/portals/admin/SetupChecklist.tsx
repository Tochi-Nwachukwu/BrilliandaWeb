import { Link } from "react-router-dom";
import type { SetupItemId, SetupStatus } from "@brillanda/shared-types";
import { Button } from "../../shared/components/Button";
import { ProgressBar } from "../../shared/components/Cards";
import { Icon } from "../../shared/components/Icon";
import { cx } from "../../shared/utils/cx";
import { useHideChecklist } from "./api";

// The rest of setup, as a checklist and never a gate (Onboarding Flow §3, step 5; DECISIONS.md F-39).
// Each item says what it unlocks. It can be hidden, and it goes for good once everything is done.

const ITEMS: Record<SetupItemId, { title: string; unlocks: string; to: string; action: string }> = {
  IMPORT_STUDENTS: { title: "Import your full student list", unlocks: "Teachers see their classes, and you can invite parents.", to: "/admin/students/import", action: "Import" },
  INVITE_TEACHERS: { title: "Invite your teachers", unlocks: "Teachers can start entering scores for their classes.", to: "/admin/staff", action: "Invite" },
  CHECK_GRADING: { title: "Check your grading scale", unlocks: "Grades on every report card follow your school's scale. Save it once it looks right.", to: "/admin/settings?tab=scale", action: "Check" },
  UPLOAD_LOGO: { title: "Upload your school logo", unlocks: "Your logo goes on report cards.", to: "/admin/settings?tab=school", action: "Upload" },
  SET_TERM: { title: "Set your current term", unlocks: "Teachers see when scores are due, and report cards say when next term begins.", to: "/admin/settings?tab=term", action: "Set dates" },
};

export function SetupChecklist({ setup, schoolName }: { setup: SetupStatus; schoolName: string }) {
  const hide = useHideChecklist();
  const done = setup.checklist.filter((item) => item.done).length;
  if (setup.checklistHidden || done === setup.checklist.length) return null;
  const next = setup.checklist.find((item) => !item.done)?.id;

  return (
    <section aria-labelledby="setup-title" className="animate-pop rounded-3xl bg-surface p-5 shadow-raised sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="setup-title" className="text-[17px] font-semibold tracking-[-0.02em]">Finish setting up {schoolName}</h2>
          <p className="mt-0.5 text-[13px] text-text-secondary">
            {done} of {setup.checklist.length} done. None of it stops you using Brillanda in the meantime.
          </p>
        </div>
        <Button size="sm" variant="ghost" loading={hide.isPending} onClick={() => hide.mutate(true)}>Hide</Button>
      </div>
      <div className="mt-3 max-w-sm">
        <ProgressBar value={done / setup.checklist.length} color="var(--color-chart)" />
      </div>
      <ul className="mt-4 grid gap-2">
        {setup.checklist.map(({ id, done: isDone }) => {
          const item = ITEMS[id];
          return (
            <li key={id} className={cx("grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-2xl p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]", id === next ? "bg-sunken" : "")}>
              <span aria-hidden className={cx("grid h-8 w-8 place-items-center rounded-full", isDone ? "bg-success-bg text-success" : "bg-raise text-text-muted shadow-raised")}>
                {isDone ? <Icon name="check" className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-current" />}
              </span>
              <div className="min-w-0">
                <b className={cx("block text-[15px] font-semibold", isDone && "text-text-secondary line-through decoration-text-muted")}>
                  {item.title}
                  <span className="sr-only">{isDone ? " (done)" : ""}</span>
                </b>
                {!isDone && <span className="block text-[13px] text-text-secondary">{item.unlocks}</span>}
              </div>
              {!isDone && (
                <Link
                  to={item.to}
                  className={cx(
                    "col-start-2 inline-flex min-h-[36px] items-center justify-self-start rounded-full px-4 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:col-start-auto",
                    id === next ? "bg-primary text-primary-text" : "bg-raise shadow-raised",
                  )}
                >
                  {item.action}
                  <span className="sr-only">: {item.title}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
