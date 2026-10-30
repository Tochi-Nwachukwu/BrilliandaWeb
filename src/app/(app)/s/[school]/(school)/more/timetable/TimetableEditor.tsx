"use client";

import type { Section } from "@brillianda/core/classes";
import { DAY_NAME, groupFor, groupName, groupsSchema, periodsSchema, readTimetableGrid, SECTION_SHORT, SECTIONS, shortTime, type Day, type Period } from "@brillianda/core/timetable";
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
import type { ActionResult, TimetableGroup, TimetablePage } from "@/data/types";
import { downloadTimetableTemplate, readTimetableFile, sheetName } from "@/lib/timetable/files";
import { timeAgo } from "@/lib/time";

type Actions = {
  setLesson: (armId: string, input: unknown) => Promise<ActionResult<null>>;
  saveBells: (input: unknown) => Promise<ActionResult<{ removed: number }>>;
  saveGroups: (input: unknown) => Promise<ActionResult<{ removed: number }>>;
  importFile: (input: unknown) => Promise<ActionResult<{ classes: number; lessons: number }>>;
  uploadPdf: (form: FormData) => Promise<ActionResult<null>>;
  removePdf: (groupId?: string) => Promise<ActionResult<null>>;
};

const pill = (active: boolean) =>
  cx(
    "inline-flex min-h-[40px] shrink-0 items-center rounded-full px-4 text-sm font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent",
    active ? "bg-primary text-primary-text" : "bg-raise shadow-raised hover:bg-hover",
  );

/**
 * More › Timetable (batch 22): each class's week, the bell schedule, and uploads. A school can split
 * its timetable by class group (Primary, JSS, SSS): each timetable has its own bell schedule,
 * classes and document, and a "Split by class" screen to choose which classes share one.
 */
export function TimetableEditor({ page, schoolName, today, now, actions }: { page: TimetablePage; schoolName: string; today: Day | null; now: number; actions: Actions }) {
  const [tab, setTab] = useState<"classes" | "bells" | "split">("classes");
  const [groupId, setGroupId] = useState(page.groups[0]!.id);
  const group = page.groups.find((g) => g.id === groupId) ?? page.groups[0]!;
  const arms = page.arms.filter((a) => groupFor(page.groups, a.section).id === group.id);
  const [armId, setArmId] = useState<string | null>(arms.find((a) => page.lessons.some((l) => l.armId === a.id))?.id ?? arms[0]?.id ?? null);
  const shownArmId = arms.some((a) => a.id === armId) ? armId : (arms[0]?.id ?? null);
  const [uploading, setUploading] = useState(false);
  const labels = new Map(arms.map((a) => [a.id, a.label]));
  const periodLabel = (id: string) => page.groups.flatMap((g) => g.periods).find((p) => p.id === id)?.label ?? "";
  // The class sections this school has, in order. Splitting only makes sense with two or more.
  const sections = SECTIONS.filter((s) => page.arms.some((a) => a.section === s));
  const canSplit = page.canSplit && page.me.canEdit && sections.length > 1;
  const several = page.groups.length > 1;

  const pickGroup = (id: string) => {
    setGroupId(id);
    const mine = page.arms.filter((a) => groupFor(page.groups, a.section).id === id);
    setArmId(mine.find((a) => page.lessons.some((l) => l.armId === a.id))?.id ?? mine[0]?.id ?? null);
    if (tab === "split") setTab("classes");
  };

  const template = () =>
    downloadTimetableTemplate(
      several ? `${schoolName}: ${group.name}` : schoolName,
      group.periods,
      arms.map((a) => {
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
      {several && (
        <div role="group" aria-label="Timetable" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {page.groups.map((g) => (
            <button key={g.id} type="button" aria-pressed={g.id === group.id} onClick={() => pickGroup(g.id)} className={pill(g.id === group.id)}>
              {g.name}
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Timetable" className="flex flex-wrap gap-2">
          <button type="button" role="tab" aria-selected={tab === "classes"} onClick={() => setTab("classes")} className={pill(tab === "classes")}>
            Classes
          </button>
          <button type="button" role="tab" aria-selected={tab === "bells"} onClick={() => setTab("bells")} className={pill(tab === "bells")}>
            Bell schedule
          </button>
          {canSplit && (
            <button type="button" role="tab" aria-selected={tab === "split"} onClick={() => setTab("split")} className={pill(tab === "split")}>
              Split by class
            </button>
          )}
        </div>
        {tab !== "split" && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={template}>
              Download the template
            </Button>
            <Button onClick={() => setUploading(true)}>Upload a timetable</Button>
          </div>
        )}
      </div>

      {page.clashes.length > 0 && tab !== "split" && (
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

      {group.file && tab !== "split" && <DocumentCard file={group.file} now={now} remove={() => actions.removePdf(group.id)} />}

      {tab === "split" ? (
        <SplitTimetable
          key={page.groups.map((g) => `${g.id}:${g.sections.join("")}`).join("|")}
          page={page}
          sections={sections}
          save={actions.saveGroups}
          onDone={() => {
            setTab("classes");
            setGroupId(page.groups[0]!.id);
          }}
        />
      ) : tab === "bells" ? (
        <BellSchedule key={group.id} periods={group.periods} groupId={group.id} groupName={several ? group.name : null} save={actions.saveBells} />
      ) : arms.length === 0 ? (
        <Alert tone="info">{several ? `${group.name} has no classes yet.` : "Add your classes first: each class gets its own week."}</Alert>
      ) : (
        <>
          <div role="group" aria-label="Class" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {arms.map((a) => (
              <button key={a.id} type="button" aria-pressed={a.id === shownArmId} onClick={() => setArmId(a.id)} className={pill(a.id === shownArmId)}>
                {a.label}
              </button>
            ))}
          </div>
          {shownArmId && <ClassWeek key={shownArmId} page={page} periods={group.periods} armId={shownArmId} label={labels.get(shownArmId)!} today={today} setLesson={actions.setLesson} />}
        </>
      )}

      {uploading && <UploadDialog page={page} group={group} arms={arms} armId={shownArmId} onClose={() => setUploading(false)} importFile={actions.importFile} uploadPdf={actions.uploadPdf} />}
    </div>
  );
}

function ClassWeek({ page, periods, armId, label, today, setLesson }: { page: TimetablePage; periods: Period[]; armId: string; label: string; today: Day | null; setLesson: Actions["setLesson"] }) {
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
        periods={periods}
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

function BellSchedule({ periods: initial, groupId, groupName: forGroup, save }: { periods: Period[]; groupId: string; groupName: string | null; save: Actions["saveBells"] }) {
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
      const result = await save({ periods, groupId });
      if (!result.ok) return setFailure(result.error);
      toast(result.data.removed ? `Bell schedule saved. ${result.data.removed} lessons in removed periods were cleared.` : "Bell schedule saved");
      router.refresh();
    });
  };

  return (
    <Card title={forGroup ? `Bell schedule: ${forGroup}` : "Bell schedule"} description={forGroup ? `The same periods for every class in ${forGroup}, Monday to Friday. Breaks have no lessons.` : "The same periods for every class, Monday to Friday. Breaks have no lessons."}>
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

function DocumentCard({ file, now, remove }: { file: NonNullable<TimetableGroup["file"]>; now: number; remove: () => Promise<ActionResult<null>> }) {
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

function UploadDialog({ page, group, arms, armId, onClose, importFile, uploadPdf }: { page: TimetablePage; group: TimetableGroup; arms: TimetablePage["arms"]; armId: string | null; onClose: () => void; importFile: Actions["importFile"]; uploadPdf: Actions["uploadPdf"] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [pdf, setPdf] = useState<File | null>(null);
  const [sheets, setSheets] = useState<{ name: string; rows: string[][] }[] | null>(null);
  const [forArm, setForArm] = useState(armId ?? "");
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const byKey = new Map(arms.map((a) => [key(sheetName(a.label)), a]));
  const previews: Preview[] = [];
  if (sheets) {
    const matched = sheets.filter((s) => byKey.has(key(s.name)));
    // Sheets named after classes go to those classes; otherwise the first table is for the class chosen here.
    const targets = matched.length ? matched.map((s) => ({ sheet: s, arm: byKey.get(key(s.name))! })) : forArm ? [{ sheet: sheets[0]!, arm: arms.find((a) => a.id === forArm)! }] : [];
    for (const { sheet, arm } of targets) {
      const read = readTimetableGrid(sheet.rows, group.periods, page.subjects);
      previews.push(
        read.ok
          ? { armId: arm.id, label: arm.label, lessons: read.lessons, problems: read.problems.map((p) => `${DAY_NAME[p.day]}, ${group.periods.find((x) => x.id === p.periodId)?.label}: ${p.message}`) }
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
        form.set("groupId", group.id);
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
      description={`Excel, CSV or Word: days down the side, periods across the top (the template is ready-made). A PDF is kept as a document staff can open${page.groups.length > 1 ? ` for ${group.name}` : ""}.`}
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
            {arms.map((a) => (
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
          Times in the file must match the bell schedule{page.groups.length > 1 ? ` for ${group.name}` : ""} ({group.periods.filter((p) => p.kind === "lesson").length} lessons from {shortTime(group.periods[0]?.start ?? "08:00")}).
        </p>
      </div>
    </ResponsiveDialog>
  );
}

type Draft = { key: string; id?: string; name: string; sections: Section[]; named: boolean };

/**
 * Choose which classes share a timetable: Primary on its own, JSS and SSS together or apart. Each
 * timetable has its own bell schedule and document. A class belongs to exactly one.
 */
function SplitTimetable({ page, sections, save, onDone }: { page: TimetablePage; sections: Section[]; save: Actions["saveGroups"]; onDone: () => void }) {
  const router = useRouter();
  const auto = (picked: Section[]) => groupName(picked, sections);
  const [drafts, setDrafts] = useState<Draft[]>(() =>
    page.groups.map((g) => {
      const own = g.sections.filter((s) => sections.includes(s));
      return { key: g.id, id: g.id, name: g.name, sections: own, named: g.name !== auto(own) };
    }),
  );
  const [failure, setFailure] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const room = Math.min(4, sections.length);

  const move = (key: string, section: Section) =>
    setDrafts((all) =>
      all.map((d) => {
        const sections = d.key === key ? (d.sections.includes(section) ? d.sections.filter((s) => s !== section) : [...d.sections, section]) : d.sections.filter((s) => s !== section);
        return { ...d, sections, name: d.named ? d.name : auto(sections) };
      }),
    );

  // A preset keeps an existing timetable's bell schedule where the classes still match it.
  const preset = (groups: Section[][]) => {
    const used = new Set<string>();
    setDrafts(
      groups.map((picked, i) => {
        const existing = page.groups.find((g) => !used.has(g.id) && picked.some((s) => g.sections.includes(s)));
        if (existing) used.add(existing.id);
        return { key: existing?.id ?? `new${i}`, id: existing?.id, name: auto(picked), sections: picked, named: false };
      }),
    );
  };
  const presets: { label: string; groups: Section[][] }[] = [
    { label: "One timetable for everyone", groups: [sections] },
    { label: "Each class group on its own", groups: sections.map((s) => [s]) },
    ...(sections.includes("primary") && sections.length > 2 ? [{ label: "Primary on its own, the rest together", groups: [["primary" as Section], sections.filter((s) => s !== "primary")] }] : []),
  ];

  const submit = () => {
    setFailure(null);
    const input = { groups: drafts.map((d) => ({ id: d.id, name: d.name, sections: d.sections })) };
    const checked = groupsSchema.safeParse(input);
    if (!checked.success) return setFailure(checked.error.issues[0]?.message ?? "Please check the timetables.");
    startTransition(async () => {
      const result = await save(input);
      if (!result.ok) return setFailure(result.error);
      toast(result.data.removed ? `Timetables saved. ${result.data.removed} lessons that no longer fit a bell schedule were cleared.` : "Timetables saved");
      router.refresh();
      onDone();
    });
  };

  return (
    <Card title="Split the timetable by class" description="Give Primary its own bell schedule, and choose whether JSS and SSS share one or each have their own. Every class belongs to one timetable.">
      <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Quick choices">
        {presets.map((p) => (
          <button key={p.label} type="button" onClick={() => preset(p.groups)} className="inline-flex min-h-[36px] items-center rounded-full bg-raise px-3.5 text-[13px] font-medium shadow-raised hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
            {p.label}
          </button>
        ))}
      </div>
      <ol className="grid gap-3">
        {drafts.map((d, i) => (
          <li key={d.key} className="grid gap-3 rounded-2xl bg-sunken p-3.5">
            <TextField label={`Timetable ${i + 1}: name`} value={d.name} onChange={(e) => setDrafts((all) => all.map((x) => (x.key === d.key ? { ...x, name: e.target.value, named: true } : x)))} />
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium">Classes it covers</legend>
              <div className="flex flex-wrap gap-2">
                {sections.map((s) => (
                  <label key={s} className={cx("inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-full px-3.5 text-sm font-medium focus-within:ring-2 focus-within:ring-accent", d.sections.includes(s) ? "bg-primary text-primary-text" : "bg-raise shadow-raised hover:bg-hover")}>
                    <input type="checkbox" className="sr-only" checked={d.sections.includes(s)} onChange={() => move(d.key, s)} />
                    {SECTION_SHORT[s]}
                  </label>
                ))}
              </div>
            </fieldset>
            {drafts.length > 1 && (
              <Button size="sm" variant="danger-quiet" className="justify-self-start" onClick={() => setDrafts((all) => all.filter((x) => x.key !== d.key))}>
                Remove this timetable
              </Button>
            )}
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {drafts.length < room && (
          <Button variant="secondary" onClick={() => setDrafts((all) => [...all, { key: `new${Date.now()}`, name: "New timetable", sections: [], named: true }])}>
            Add a timetable
          </Button>
        )}
        <Button loading={pending} onClick={submit}>
          Save
        </Button>
      </div>
      <p className="mt-3 text-[12.5px] text-text-secondary">A new timetable starts with a copy of the first one’s bell schedule: change it on the Bell schedule tab. Lessons that don’t fit a class’s bell schedule are cleared.</p>
      <div className="mt-3">
        <FormError message={failure} />
      </div>
    </Card>
  );
}
