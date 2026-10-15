"use client";

import { DAY_NAME, periodsSchema, readTimetableGrid, shortTime, type Day, type Period } from "@brillianda/core/timetable";
import { Alert } from "@brillianda/ui/Alert";
import { Button } from "@brillianda/ui/Button";
import { Card } from "@brillianda/ui/Cards";
import { cx } from "@brillianda/ui/cx";
import { ResponsiveDialog } from "@brillianda/ui/ResponsiveDialog";
import { SelectField, TextField } from "@brillianda/ui/TextField";
import { toast } from "@brillianda/ui/Toast";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { FormError } from "@/components/auth/FormError";
import { WeekGrid } from "@/components/timetable/WeekGrid";
import type { ActionResult, TimetablePage } from "@/data/types";
import { downloadTimetableTemplate, readTimetableFile, sheetName } from "@/lib/timetable/files";
import { timeAgo } from "@/lib/time";

type Actions = {
  setLesson: (armId: string, input: unknown) => Promise<ActionResult<null>>;
  saveBells: (input: unknown) => Promise<ActionResult<{ removed: number }>>;
  importFile: (input: unknown) => Promise<ActionResult<{ classes: number; lessons: number }>>;
  uploadPdf: (form: FormData) => Promise<ActionResult<null>>;
  removePdf: () => Promise<ActionResult<null>>;
};

const pill = (active: boolean) =>
  cx(
    "inline-flex min-h-[40px] shrink-0 items-center rounded-full px-4 text-sm font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent",
    active ? "bg-primary text-primary-text" : "bg-raise shadow-raised hover:bg-hover",
  );

/** More › Timetable (batch 22): each class's week, the bell schedule, and uploads. */
export function TimetableEditor({ page, schoolName, today, now, actions }: { page: TimetablePage; schoolName: string; today: Day | null; now: number; actions: Actions }) {
  const [tab, setTab] = useState<"classes" | "bells">("classes");
  const [armId, setArmId] = useState(page.arms.find((a) => page.lessons.some((l) => l.armId === a.id))?.id ?? page.arms[0]?.id ?? null);
  const [uploading, setUploading] = useState(false);
  const labels = new Map(page.arms.map((a) => [a.id, a.label]));
  const periodLabel = (id: string) => page.periods.find((p) => p.id === id)?.label ?? "";

  const template = () =>
    downloadTimetableTemplate(
      schoolName,
      page.periods,
      page.arms.map((a) => {
        const names = new Map(page.subjects.map((s) => [s.id, s.name]));
        return {
          id: a.id,
          label: a.label,
          subjects: page.subjects.filter((s) => s.levelIds.includes(a.levelId)).map((s) => s.name),
          lessons: new Map(page.lessons.filter((l) => l.armId === a.id).map((l) => [`${l.day}|${l.periodId}`, names.get(l.subjectId) ?? ""])),
        };
      }),
    );

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Timetable" className="flex gap-2">
          <button type="button" role="tab" aria-selected={tab === "classes"} onClick={() => setTab("classes")} className={pill(tab === "classes")}>
            Classes
          </button>
          <button type="button" role="tab" aria-selected={tab === "bells"} onClick={() => setTab("bells")} className={pill(tab === "bells")}>
            Bell schedule
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={template}>
            Download the template
          </Button>
          <Button onClick={() => setUploading(true)}>Upload a timetable</Button>
        </div>
      </div>

      {page.clashes.length > 0 && (
        <Alert tone="warning">
          <b className="font-semibold">A teacher is in two classes at once.</b>
          <ul className="mt-1 list-disc pl-5">
            {page.clashes.slice(0, 5).map((c) => (
              <li key={`${c.teacherName}-${c.day}-${c.periodId}`}>
                {c.teacherName}, {DAY_NAME[c.day]} {periodLabel(c.periodId)}: {c.armLabels.join(" and ")}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {page.file && <DocumentCard file={page.file} now={now} remove={actions.removePdf} />}

      {tab === "bells" ? (
        <BellSchedule periods={page.periods} save={actions.saveBells} />
      ) : page.arms.length === 0 ? (
        <Alert tone="info">Add your classes first: each class gets its own week.</Alert>
      ) : (
        <>
          <div role="group" aria-label="Class" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {page.arms.map((a) => (
              <button key={a.id} type="button" aria-pressed={a.id === armId} onClick={() => setArmId(a.id)} className={pill(a.id === armId)}>
                {a.label}
              </button>
            ))}
          </div>
          {armId && (
            <ClassWeek
              key={armId}
              page={page} armId={armId}
              label={labels.get(armId)!}
              today={today}
              setLesson={actions.setLesson}
            />
          )}
        </>
      )}

      {uploading && <UploadDialog page={page} armId={armId} onClose={() => setUploading(false)} importFile={actions.importFile} uploadPdf={actions.uploadPdf} />}
    </div>
  );
}

function ClassWeek({ page, armId, label, today, setLesson }: { page: TimetablePage; armId: string; label: string; today: Day | null; setLesson: Actions["setLesson"] }) {
  const router = useRouter();
  const arm = page.arms.find((a) => a.id === armId)!;
  const saved = page.lessons.filter((l) => l.armId === armId);
  const fromPage = () => new Map(saved.map((l) => [`${l.day}|${l.periodId}`, l]));
  const [lessons, setLessons] = useState(fromPage);
  // When the saved week changes (an upload, a refresh after a save), show it; the day picked stays.
  const signature = saved.map((l) => `${l.day}${l.periodId}${l.subjectId}`).join();
  const [seen, setSeen] = useState(signature);
  if (signature !== seen) {
    setSeen(signature);
    setLessons(fromPage());
  }
  const [, startTransition] = useTransition();
  const choices = page.subjects.filter((s) => s.levelIds.includes(arm.levelId));
  const filled = lessons.size;

  const change = (day: Day, period: Period, subjectId: string) => {
    const key = `${day}|${period.id}`;
    const before = lessons.get(key);
    setLessons((all) => {
      const next = new Map(all);
      if (subjectId) next.set(key, { armId, day, periodId: period.id, subjectId, teacherId: null, teacherName: null });
      else next.delete(key);
      return next;
    });
    startTransition(async () => {
      const result = await setLesson(armId, { day, periodId: period.id, subjectId: subjectId || null });
      if (!result.ok) {
        toast(result.error);
        setLessons((all) => {
          const next = new Map(all);
          if (before) next.set(key, before);
          else next.delete(key);
          return next;
        });
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="grid gap-2">
      <p className="text-sm text-text-secondary">
        {label}: {filled === 1 ? "1 lesson" : `${filled} lessons`} a week. Choose a subject for each period; the teacher comes from Teachers.
      </p>
      <WeekGrid
        label={`${label} timetable`}
        periods={page.periods}
        today={today}
        cell={(day, period) => {
          const lesson = lessons.get(`${day}|${period.id}`);
          const teacher = page.lessons.find((l) => l.armId === armId && l.day === day && l.periodId === period.id && l.subjectId === lesson?.subjectId)?.teacherName;
          return (
            <div className="grid gap-0.5">
              <select
                aria-label={`${DAY_NAME[day]}, ${period.label}`}
                value={lesson?.subjectId ?? ""}
                onChange={(e) => change(day, period, e.target.value)}
                className={cx(
                  "h-9 w-full min-w-0 rounded-lg bg-transparent px-1.5 text-[13px] font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent",
                  !lesson && "text-text-muted",
                )}
              >
                <option value="">Free</option>
                {choices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
                {lesson && !choices.some((s) => s.id === lesson.subjectId) && <option value={lesson.subjectId}>{page.subjects.find((s) => s.id === lesson.subjectId)?.name ?? "A removed subject"}</option>}
              </select>
              {teacher && <span className="truncate px-1.5 text-[11.5px] text-text-secondary">{teacher}</span>}
            </div>
          );
        }}
      />
    </div>
  );
}

function BellSchedule({ periods: initial, save }: { periods: Period[]; save: Actions["saveBells"] }) {
  const router = useRouter();
  const [periods, setPeriods] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set = (i: number, next: Partial<Period>) => {
    setPeriods((all) => all.map((p, j) => (j === i ? { ...p, ...next } : p)));
    setErrors({});
  };

  const add = () => {
    const last = periods[periods.length - 1];
    const start = last?.end ?? "08:00";
    const [h, m] = start.split(":").map(Number) as [number, number];
    const endMinutes = Math.min(h * 60 + m + 40, 23 * 60 + 59);
    const end = `${String(Math.floor(endMinutes / 60)).padStart(2, "0")}:${String(endMinutes % 60).padStart(2, "0")}`;
    const n = periods.filter((p) => p.kind === "lesson").length + 1;
    setPeriods((all) => [...all, { id: `p${Date.now().toString(36)}`, label: `Period ${n}`, start, end, kind: "lesson" }]);
  };

  const submit = () => {
    setFailure(null);
    const checked = periodsSchema.safeParse(periods);
    if (!checked.success) {
      const fields: Record<string, string[]> = {};
      for (const issue of checked.error.issues) (fields[issue.path.join(".")] ??= []).push(issue.message);
      setErrors(fields);
      return setFailure(checked.error.issues[0]?.message ?? "Please check the periods.");
    }
    startTransition(async () => {
      const result = await save({ periods });
      if (!result.ok) return setFailure(result.error);
      toast(result.data.removed ? `Bell schedule saved. ${result.data.removed} lessons in removed periods were cleared.` : "Bell schedule saved");
      router.refresh();
    });
  };

  return (
    <Card title="Bell schedule" description="The same periods for every class, Monday to Friday. Breaks have no lessons.">
      <ol className="grid gap-3">
        {periods.map((p, i) => (
          <li key={p.id} className="grid grid-cols-2 gap-2 rounded-2xl bg-sunken p-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
            <TextField label="Name" value={p.label} onChange={(e) => set(i, { label: e.target.value })} error={errors[`${i}.label`]?.[0]} className="col-span-2 sm:col-span-1" />
            <TextField label="Starts" type="time" value={p.start} onChange={(e) => set(i, { start: e.target.value })} error={errors[`${i}.start`]?.[0]} />
            <TextField label="Ends" type="time" value={p.end} onChange={(e) => set(i, { end: e.target.value })} error={errors[`${i}.end`]?.[0]} />
            <SelectField label="Kind" value={p.kind} onChange={(e) => set(i, { kind: e.target.value as Period["kind"] })}>
              <option value="lesson">Lesson</option>
              <option value="break">Break</option>
            </SelectField>
            <Button size="sm" variant="danger-quiet" className="mb-1 justify-self-start" onClick={() => setPeriods((all) => all.filter((_, j) => j !== i))} aria-label={`Remove ${p.label}`}>
              Remove
            </Button>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="secondary" onClick={add}>
          Add a period
        </Button>
        <Button loading={pending} onClick={submit}>
          Save the bell schedule
        </Button>
      </div>
      <div className="mt-3">
        <FormError message={failure} />
      </div>
    </Card>
  );
}

function DocumentCard({ file, now, remove }: { file: NonNullable<TimetablePage["file"]>; now: number; remove: Actions["removePdf"] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Card title="Timetable document" description={`${file.name} · uploaded by ${file.by}, ${timeAgo(file.at, now)}. Staff can open it; it doesn’t highlight anyone’s lessons.`}>
      <div className="flex flex-wrap gap-2">
        <a href={file.url} download={file.name} className="inline-flex min-h-[40px] items-center rounded-full bg-raise px-4 text-sm font-medium shadow-raised hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
          Open the PDF
        </a>
        <Button
          variant="danger-quiet"
          loading={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await remove();
              toast(result.ok ? "Document removed" : result.error);
              if (result.ok) router.refresh();
            })
          }
        >
          Remove
        </Button>
      </div>
    </Card>
  );
}

type Preview = { armId: string; label: string; lessons: { day: Day; periodId: string; subjectId: string }[]; problems: string[] };

/** "jss1blue" from "JSS 1 Blue" or "JSS1 BLUE": how sheet names meet class names. */
const key = (text: string) => text.toLowerCase().replace(/[^a-z0-9]/g, "");

function UploadDialog({ page, armId, onClose, importFile, uploadPdf }: { page: TimetablePage; armId: string | null; onClose: () => void; importFile: Actions["importFile"]; uploadPdf: Actions["uploadPdf"] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [sheets, setSheets] = useState<{ name: string; rows: string[][] }[] | null>(null);
  const [forArm, setForArm] = useState(armId ?? "");
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const byKey = new Map(page.arms.map((a) => [key(sheetName(a.label)), a]));
  const previews: Preview[] = [];
  if (sheets) {
    const matched = sheets.filter((s) => byKey.has(key(s.name)));
    // Sheets named after classes go to those classes; otherwise the first table is for the class chosen here.
    const targets = matched.length ? matched.map((s) => ({ sheet: s, arm: byKey.get(key(s.name))! })) : forArm ? [{ sheet: sheets[0]!, arm: page.arms.find((a) => a.id === forArm)! }] : [];
    for (const { sheet, arm } of targets) {
      const read = readTimetableGrid(sheet.rows, page.periods, page.subjects);
      previews.push(
        read.ok
          ? { armId: arm.id, label: arm.label, lessons: read.lessons, problems: read.problems.map((p) => `${DAY_NAME[p.day]}, ${page.periods.find((x) => x.id === p.periodId)?.label}: ${p.message}`) }
          : { armId: arm.id, label: arm.label, lessons: [], problems: [read.message] },
      );
    }
  }
  const matchedSheets = sheets ? sheets.some((s) => byKey.has(key(s.name))) : false;
  const usable = previews.filter((p) => p.lessons.length > 0);

  const pick = async (file: File | undefined) => {
    setFailure(null);
    setSheets(null);
    setPdf(null);
    if (!file) return;
    setFileName(file.name);
    const read = await readTimetableFile(file);
    if (!read.ok) return setFailure(read.message);
    if (read.kind === "pdf") setPdf(read.file);
    else setSheets(read.sheets);
  };

  const confirm = () =>
    startTransition(async () => {
      if (pdf) {
        const form = new FormData();
        form.set("file", pdf);
        const result = await uploadPdf(form);
        if (!result.ok) return setFailure(result.error);
        toast("Timetable document saved");
      } else {
        const result = await importFile({ fileName, classes: usable.map((p) => ({ armId: p.armId, lessons: p.lessons })) });
        if (!result.ok) return setFailure(result.error);
        toast(`Timetable saved: ${result.data.lessons} lessons in ${result.data.classes === 1 ? "1 class" : `${result.data.classes} classes`}`);
      }
      onClose();
      router.refresh();
    });

  return (
    <ResponsiveDialog
      open
      onClose={onClose}
      title="Upload a timetable"
      description="Excel, CSV or Word: days down the side, periods across the top (the template is ready-made). A PDF is kept as a document staff can open."
      footer={
        <Button className="w-full" loading={pending} disabled={!pdf && usable.length === 0} onClick={confirm}>
          {pdf ? "Save the document" : usable.length > 1 ? `Replace ${usable.length} classes’ timetables` : "Replace this class’s timetable"}
        </Button>
      }
    >
      <div className="grid gap-4">
        <input ref={input} type="file" accept=".xlsx,.csv,.docx,.pdf" className="sr-only" aria-label="Timetable file" onChange={(e) => pick(e.target.files?.[0])} />
        <Button variant="secondary" onClick={() => input.current?.click()}>
          {fileName ? `Chosen: ${fileName}. Choose another` : "Choose a file"}
        </Button>
        {pdf && <Alert tone="info">This PDF will be the school’s timetable document. Staff can open it, but it can’t highlight anyone’s lessons: for that, upload Excel, CSV or Word.</Alert>}
        {sheets && !matchedSheets && (
          <SelectField label="This timetable is for" value={forArm} onChange={(e) => setForArm(e.target.value)}>
            <option value="">Choose a class</option>
            {page.arms.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </SelectField>
        )}
        {previews.length > 0 && (
          <ul className="grid gap-2" aria-label="What we found">
            {previews.map((p) => (
              <li key={p.armId} className="rounded-2xl bg-sunken p-3.5 text-sm">
                <b className="font-semibold">{p.label}</b>: {p.lessons.length === 1 ? "1 lesson" : `${p.lessons.length} lessons`}
                {p.problems.length > 0 && (
                  <ul className="mt-1 list-disc pl-5 text-text-secondary">
                    {p.problems.slice(0, 4).map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                    {p.problems.length > 4 && <li>and {p.problems.length - 4} more, left empty</li>}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
        <FormError message={failure} />
        <p className="text-[12.5px] text-text-secondary">
          Times in the file must match the bell schedule ({page.periods.filter((p) => p.kind === "lesson").length} lessons from {shortTime(page.periods[0]?.start ?? "08:00")}).
        </p>
      </div>
    </ResponsiveDialog>
  );
}
