"use client";

import { DEPARTMENT_LABEL, DEPARTMENTS, subjectNameSchema, type LinkKind } from "@brillianda/core";
import { Badge, Button, Card, Icon, PageHeader, ResponsiveDialog, SelectField, cx, toast } from "@brillianda/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FormDialog } from "@/components/FormDialog";
import type { ActionResult, Subject, SubjectLink, SubjectsSetup } from "@/data/types";
import { SubjectPicker } from "./SubjectPicker";

export type SubjectActions = {
  addSubjects: (input: unknown) => Promise<ActionResult<{ added: number }>>;
  renameSubject: (subjectId: string, input: unknown) => Promise<ActionResult<null>>;
  removeSubject: (subjectId: string) => Promise<ActionResult<null>>;
  setSubjectLink: (subjectId: string, levelId: string, kind: string | null) => Promise<ActionResult<null>>;
  setSubjectDepartment: (subjectId: string, department: string | null) => Promise<ActionResult<null>>;
};

const KIND_LABEL: Record<LinkKind, string> = { compulsory: "Compulsory", elective: "Elective" };
const NEXT: Record<"none" | LinkKind, LinkKind | null> = { none: "compulsory", compulsory: "elective", elective: null };
const key = (subjectId: string, levelId: string) => `${subjectId}|${levelId}`;

/** After setup: which class levels take which subjects. A grid on laptop; one level at a time on phone. */
export function SubjectsView({ setup, actions }: { setup: SubjectsSetup; actions: SubjectActions }) {
  const router = useRouter();
  const [links, setLinks] = useState(() => new Map(setup.links.map((l) => [key(l.subjectId, l.levelId), l])));
  const [levelId, setLevelId] = useState(setup.levels[0]?.id ?? "");
  const [editing, setEditing] = useState<Subject | null>(null);
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();

  const kindOf = (subjectId: string, lid: string): "none" | LinkKind => links.get(key(subjectId, lid))?.kind ?? "none";

  /** Changes one link straight away on screen, then saves; puts it back if the save fails. */
  const setLink = (subjectId: string, lid: string, kind: LinkKind | null) => {
    const k = key(subjectId, lid);
    const before = links.get(k);
    setLinks((map) => {
      const next = new Map(map);
      if (kind) next.set(k, { subjectId, levelId: lid, kind, department: kind === "elective" ? (before?.department ?? null) : null });
      else next.delete(k);
      return next;
    });
    startTransition(async () => {
      const result = await actions.setSubjectLink(subjectId, lid, kind);
      if (!result.ok) {
        toast(result.error);
        setLinks((map) => {
          const next = new Map(map);
          if (before) next.set(k, before);
          else next.delete(k);
          return next;
        });
      }
    });
  };

  const level = setup.levels.find((l) => l.id === levelId);
  const countIn = (lid: string) => setup.subjects.filter((s) => kindOf(s.id, lid) !== "none").length;

  return (
    <>
      <PageHeader
        title="Subjects"
        actions={
          <Button onClick={() => setAdding(true)}>
            <Icon name="plus" className="h-4 w-4" />
            Add subjects
          </Button>
        }
      >
        {setup.subjects.length} subjects. Choose which classes take each one, and whether it’s compulsory or an elective.
      </PageHeader>

      {/* Phone: one class level at a time. */}
      <div className="grid gap-3 md:hidden">
        <div role="tablist" aria-label="Class" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {setup.levels.map((l) => (
            <button
              key={l.id}
              role="tab"
              type="button"
              aria-selected={l.id === levelId}
              onClick={() => setLevelId(l.id)}
              className={cx(
                "shrink-0 rounded-full px-4 py-2 text-sm font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent",
                l.id === levelId ? "bg-primary text-primary-text" : "bg-raise shadow-raised",
              )}
            >
              {l.name} <span className="opacity-70">{countIn(l.id)}</span>
            </button>
          ))}
        </div>
        {level && (
          <ul className="grid gap-1.5 rounded-3xl bg-surface p-2 shadow-raised" aria-label={`${level.name} subjects`}>
            {setup.subjects.map((subject) => {
              const kind = kindOf(subject.id, level.id);
              return (
                <li key={subject.id} className="grid gap-2 rounded-2xl p-2.5">
                  <button type="button" onClick={() => setEditing(subject)} className="flex items-center gap-2 text-left font-medium hover:text-accent">
                    {subject.name}
                    <span className="text-[12px] font-semibold text-text-muted">{subject.code}</span>
                  </button>
                  <div role="group" aria-label={`${subject.name} in ${level.name}`} className="grid grid-cols-3 gap-1 rounded-full bg-sunken p-1">
                    {(["none", "compulsory", "elective"] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        aria-pressed={kind === k}
                        onClick={() => kind !== k && setLink(subject.id, level.id, k === "none" ? null : k)}
                        className={cx(
                          "h-9 rounded-full text-[13px] font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent",
                          kind === k ? (k === "none" ? "bg-raise shadow-raised" : "bg-accent text-primary-text") : "text-text-secondary",
                        )}
                      >
                        {k === "none" ? "Off" : KIND_LABEL[k]}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Laptop: class levels against subjects. Tap a cell: off → compulsory → elective → off. */}
      <Card className="hidden md:block" title="Classes and subjects" description="C is compulsory, E is an elective. Tap a cell to change it.">
        <div className="-mx-2 overflow-x-auto px-2">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 z-10 bg-surface py-2 pr-3 text-left text-[12.5px] font-medium text-text-secondary">
                  Subject
                </th>
                {setup.levels.map((l) => (
                  <th key={l.id} scope="col" className="px-1 py-2 text-center text-[12px] font-medium text-text-secondary">
                    {l.short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {setup.subjects.map((subject) => (
                <tr key={subject.id} className="border-t border-divider">
                  <th scope="row" className="sticky left-0 z-10 bg-surface py-1 pr-3 text-left font-medium">
                    <button type="button" onClick={() => setEditing(subject)} className="flex items-center gap-2 rounded-lg py-1 text-left hover:text-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent">
                      <span className="max-w-[16rem] truncate">{subject.name}</span>
                      <span className="text-[11.5px] font-semibold text-text-muted">{subject.code}</span>
                      {subject.tag === "legacy" && <Badge>Legacy</Badge>}
                    </button>
                  </th>
                  {setup.levels.map((l) => {
                    const kind = kindOf(subject.id, l.id);
                    return (
                      <td key={l.id} className="px-1 py-1 text-center">
                        <button
                          type="button"
                          aria-label={`${subject.name} in ${l.name}: ${kind === "none" ? "not taught" : KIND_LABEL[kind]}`}
                          onClick={() => setLink(subject.id, l.id, NEXT[kind])}
                          className={cx(
                            "mx-auto grid h-8 w-8 place-items-center rounded-lg text-[12px] font-semibold transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent",
                            kind === "compulsory" ? "bg-accent text-primary-text" : kind === "elective" ? "bg-accent-soft text-accent" : "bg-sunken text-text-muted hover:bg-hover",
                          )}
                        >
                          {kind === "compulsory" ? "C" : kind === "elective" ? "E" : "·"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {editing && (
        <SubjectDialog
          subject={editing}
          seniorElectives={[...links.values()].filter((l) => l.subjectId === editing.id && l.kind === "elective" && setup.levels.find((x) => x.id === l.levelId)?.section === "senior")}
          actions={actions}
          onClose={() => setEditing(null)}
          onChanged={(message) => {
            toast(message);
            setEditing(null);
            router.refresh();
          }}
        />
      )}

      <ResponsiveDialog open={adding} onClose={() => setAdding(false)} laptop="panel" title="Add subjects" description="From the national list, or your own.">
        {adding && (
          <SubjectPicker
            catalogue={setup.catalogue}
            bands={setup.bands}
            existing={setup.subjects.map((s) => s.catalogueId).filter((id): id is string => !!id)}
            takenCodes={setup.subjects.map((s) => s.code)}
            add={actions.addSubjects}
            first={false}
            onAdded={(added) => {
              toast(`${added} ${added === 1 ? "subject" : "subjects"} added`);
              setAdding(false);
              router.refresh();
            }}
          />
        )}
      </ResponsiveDialog>
    </>
  );
}

function SubjectDialog({
  subject,
  seniorElectives,
  actions,
  onClose,
  onChanged,
}: {
  subject: Subject;
  seniorElectives: SubjectLink[];
  actions: SubjectActions;
  onClose: () => void;
  onChanged: (message: string) => void;
}) {
  const [busy, startTransition] = useTransition();
  const run = (action: () => Promise<ActionResult<null>>, message: string) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) onChanged(message);
      else toast(result.error);
    });
  return (
    <FormDialog
      title={subject.name}
      description={subject.catalogueName ? `From the catalogue as ${subject.catalogueName}. Renaming keeps that link.` : subject.tag === "custom" ? "One of your own subjects." : "From the national catalogue. Renaming keeps it linked."}
      fields={[
        { key: "name", label: "Subject name", initial: subject.name },
        { key: "code", label: "Short code", initial: subject.code, hint: "Up to 5 letters, for small screens", upper: true },
      ]}
      schema={subjectNameSchema}
      submitLabel="Save"
      submit={(input) => actions.renameSubject(subject.id, input)}
      onClose={onClose}
      onDone={() => onChanged("Subject saved")}
      extra={
        <div className="grid gap-4 border-t border-divider pt-4">
          {seniorElectives.length > 0 && (
            <SelectField
              label="Department for its senior electives"
              hint="An SS arm marked with this department gets it by default."
              value={seniorElectives[0]?.department ?? ""}
              disabled={busy}
              onChange={(e) => run(() => actions.setSubjectDepartment(subject.id, e.target.value || null), "Department saved")}
            >
              <option value="">None</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {DEPARTMENT_LABEL[d]}
                </option>
              ))}
            </SelectField>
          )}
          <div>
            <Button size="sm" variant="danger-quiet" disabled={busy} onClick={() => run(() => actions.removeSubject(subject.id), `${subject.name} removed`)}>
              Remove {subject.name}
            </Button>
          </div>
        </div>
      }
    />
  );
}
