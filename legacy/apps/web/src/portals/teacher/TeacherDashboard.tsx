import type { TeacherAssignment } from "@brillanda/shared-types";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../shared/auth/authStore";
import { Alert } from "../../shared/components/Alert";
import { EntryStatusBadge } from "../../shared/components/Badge";
import { EmptyState } from "../../shared/components/EmptyState";
import { Hero } from "../../shared/components/Hero";
import { PageHeader } from "../../shared/components/PageHeader";
import { Ring } from "../../shared/components/Ring";
import { PageSpinner } from "../../shared/components/Spinner";
import { AnimatedNumber } from "../../shared/motion/AnimatedNumber";
import { levelOfArm, levelStyle } from "../../shared/theme/levels";
import { cx } from "../../shared/utils/cx";
import { useTeacherAssignments } from "./api";

function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const isFinished = (assignment: TeacherAssignment) =>
  assignment.status === "COMPLETE" || assignment.status === "LOCKED";

const scoreEntryPath = (a: TeacherAssignment) => `/teacher/score-entry/${a.armId}/${a.subjectId}/${a.termId}`;

export function TeacherDashboard() {
  const user = useAuthStore((state) => state.user);
  const { data, isPending, error } = useTeacherAssignments();

  if (isPending) return <PageSpinner />;
  if (error) return <Alert tone="danger">{error.message}</Alert>;

  const firstName = user?.fullName.split(" ")[0];
  const { term, assignments } = data;
  const finished = assignments.filter(isFinished).length;
  // The class to pick up next: one already started, otherwise the first not started.
  const next =
    assignments.find((a) => a.status === "IN_PROGRESS") ?? assignments.find((a) => a.status === "NOT_STARTED");

  return (
    <div className="space-y-10">
      <Hero
        kicker={new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
        title={`${greeting()}${firstName ? `, ${firstName}` : ""}`}
        actions={
          next && (
            <Link
              to={scoreEntryPath(next)}
              className="inline-flex min-h-[42px] items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-text transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              Continue {next.subjectName}, {next.armName}
            </Link>
          )
        }
        photo={{
          src: "/img/classroom.webp",
          alt: "Pupils raising their hands in a classroom",
          caption: (
            <>
              <b className="block text-[15px] font-semibold text-text-primary">
                {assignments.reduce((sum, a) => sum + a.studentCount, 0)} students this term
              </b>
              Across your {assignments.length === 1 ? "class" : `${assignments.length} classes`}.
            </>
          ),
        }}
      >
        {term && assignments.length > 0 && (
          <p>
            {term.name}, {term.sessionName}. You've finished <AnimatedNumber value={finished} /> of your{" "}
            {assignments.length} {assignments.length === 1 ? "class" : "classes"}.
          </p>
        )}
      </Hero>

      {!term ? (
        <EmptyState title="No term has started yet">
          Your school admin hasn't opened a term. Your classes will appear here as soon as they do.
        </EmptyState>
      ) : assignments.length === 0 ? (
        <EmptyState title="No classes yet">
          You haven't been given any classes for {term.name}. Ask your school admin to assign you to your subjects.
        </EmptyState>
      ) : (
        <section aria-labelledby="classes-heading">
          <h2 id="classes-heading" className="mb-4 text-lg font-semibold tracking-tight">
            Your classes
          </h2>
          <ClassCards assignments={assignments} />
        </section>
      )}
    </div>
  );
}

/** Every class the teacher has this term, on its own page. */
export function TeacherClasses() {
  const { data, isPending, error } = useTeacherAssignments();
  if (isPending) return <PageSpinner />;
  if (error) return <Alert tone="danger">{error.message}</Alert>;
  const { term, assignments } = data;
  return (
    <>
      <PageHeader title="My classes">{term ? `${term.name}, ${term.sessionName}.` : "No term has started yet."}</PageHeader>
      {assignments.length ? (
        <ClassCards assignments={assignments} />
      ) : (
        <EmptyState title="No classes yet">Ask your school admin to assign you to your subjects.</EmptyState>
      )}
    </>
  );
}

function ClassCards({ assignments }: { assignments: TeacherAssignment[] }) {
  return (
    <ul className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
      {assignments.map((a, index) => (
        <li key={`${a.armId}/${a.subjectId}`}>
          <ClassCard assignment={a} index={index} />
        </li>
      ))}
    </ul>
  );
}

function ClassCard({ assignment: a, index }: { assignment: TeacherAssignment; index: number }) {
  const done = a.studentCount ? a.studentsComplete / a.studentCount : 0;
  return (
    <Link
      to={scoreEntryPath(a)}
      className="group grid h-full animate-pop gap-4 rounded-3xl p-5 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      style={{ ...levelStyle(levelOfArm(a.armName)), background: "var(--tint)", color: "var(--deep)", ["--d" as string]: `${index * 0.05}s` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xl font-medium tracking-tight">{a.subjectName}</p>
          <p className="text-sm opacity-85">{a.armName}</p>
        </div>
        <Ring value={done} color="var(--deep)" track="rgba(255,255,255,0.7)" label={a.studentsComplete} />
      </div>
      <p className="text-sm tabular-nums">
        {a.studentsComplete} of {a.studentCount} students done
      </p>
      <div className="flex items-center justify-between gap-2">
        <EntryStatusBadge status={a.status} />
        <span
          className={cx(
            "rounded-full bg-[color-mix(in_oklab,var(--color-surface)_75%,transparent)] px-3.5 py-1.5 text-[13px] font-medium",
            "transition-transform group-hover:translate-x-0.5",
          )}
        >
          {isFinished(a) ? "View" : "Enter scores"}
        </span>
      </div>
    </Link>
  );
}
