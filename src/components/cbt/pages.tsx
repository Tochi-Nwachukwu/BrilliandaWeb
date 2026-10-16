// The CBT pages for teachers (/teach/tests) and admins (/more/tests): the same screens, under
// either base (batch 25).
import "server-only";
import { Badge } from "@brillianda/ui/Badge";
import { EmptyState } from "@brillianda/ui/EmptyState";
import { Icon } from "@brillianda/ui/Icon";
import { PageHeader } from "@brillianda/ui/PageHeader";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { deleteTest, markTheory, saveTest, sendScores } from "@/data/actions/cbt";
import { getTestEditor, getTestResults, getTests } from "@/data/cbt";
import type { TestRow } from "@/data/types";
import { DeleteTestButton } from "./DeleteTestButton";
import { TestEditor } from "./TestEditor";
import { TestResultsView } from "./TestResultsView";

const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { timeZone: "Africa/Lagos", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const buttonClass =
  "inline-flex min-h-[44px] items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-text hover:bg-primary-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent";
const backClass = "w-fit rounded text-sm font-medium text-text-secondary hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent";

function status(t: TestRow): { label: string; tone: "success" | "warning" | "info" | "neutral" } {
  if (t.status === "draft") return { label: "Draft", tone: "neutral" };
  if (t.window === "before") return { label: `Opens ${when(t.opensAt)}`, tone: "info" };
  if (t.window === "open") return { label: "Open now", tone: "success" };
  return t.toMark ? { label: `${t.toMark} to mark`, tone: "warning" } : { label: t.sentAt ? "Scores sent" : "Closed", tone: "neutral" };
}

export async function TestsListPage({ school, base }: { school: string; base: string }) {
  await connection();
  const tests = await getTests(school);
  if (!tests) return null;
  return (
    <div className="grid gap-4">
      <PageHeader
        title="Tests"
        actions={
          <Link href={`${base}/new`} className={buttonClass}>
            Set a test
          </Link>
        }
      >
        Tests students take on Brillianda, from the question bank. Objective answers mark themselves; you mark theory and send the scores to the score sheet.
      </PageHeader>
      {tests.length === 0 ? (
        <EmptyState title="No tests yet">Set one from your question bank: choose the class, the questions and when it’s open.</EmptyState>
      ) : (
        <ul className="grid gap-2" aria-label="Tests">
          {tests.map((t) => {
            const s = status(t);
            return (
              <li key={t.id}>
                <Link href={`${base}/${t.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-3xl bg-surface p-4 shadow-raised hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
                  <span className="min-w-0">
                    <b className="block truncate font-semibold">{t.title}</b>
                    <span className="block truncate text-[12.5px] text-text-secondary">
                      {t.armLabels.join(", ")} · {t.subjectName} · {t.questions} questions · {t.submitted} of {t.students} submitted
                      {t.byMe ? "" : ` · by ${t.by}`}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge tone={s.tone}>{s.label}</Badge>
                    <Icon name="chevron" className="h-4 w-4 text-text-muted" />
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export async function NewTestPage({ school, base, testId }: { school: string; base: string; testId?: string }) {
  await connection();
  const data = await getTestEditor(school, testId);
  if (!data) notFound();
  return (
    <div className="grid gap-4">
      <Link href={testId ? `${base}/${testId}` : base} className={backClass}>
        ← {testId ? "The test" : "Tests"}
      </Link>
      <PageHeader title={testId ? "Change the draft" : "Set a test"} />
      <TestEditor data={data} base={base} save={saveTest.bind(null, school)} />
    </div>
  );
}

export async function TestPage({ school, base, testId }: { school: string; base: string; testId: string }) {
  await connection();
  const results = await getTestResults(school, testId);
  if (!results) notFound();
  const t = results.test;
  return (
    <div className="grid gap-4">
      <Link href={base} className={backClass}>
        ← Tests
      </Link>
      <PageHeader
        title={t.title}
        actions={
          t.status === "draft" ? (
            <span className="flex flex-wrap gap-2">
              <Link href={`${base}/${t.id}/edit`} className={buttonClass}>
                Change the draft
              </Link>
              <DeleteTestButton remove={deleteTest.bind(null, school, t.id)} back={base} />
            </span>
          ) : undefined
        }
      >
        {t.armLabels.join(", ")} · {t.subjectName}
      </PageHeader>
      <TestResultsView results={results} mark={markTheory.bind(null, school, t.id)} send={sendScores.bind(null, school, t.id)} />
    </div>
  );
}
