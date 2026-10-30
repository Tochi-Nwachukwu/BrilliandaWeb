"use client";

import { NOTE_FILES_MAX, NOTES_MAX } from "@brillianda/core/questions";
import { Button } from "@brillianda/ui/Button";
import { Spinner } from "@brillianda/ui/Spinner";
import { TextAreaField } from "@brillianda/ui/TextField";
import { useRef, useState, useTransition } from "react";
import type { ActionResult } from "@/data/types";
import { readNoteFile, scansFit, type NoteFile } from "@/lib/notes/files";

/**
 * Lesson notes for the question generator, three ways: type or paste them; add a Word or text file
 * (read here); or add photos or a PDF (read by the model on the server). Whatever is read lands in
 * the box, so the teacher can correct it before generating. Nothing is stored.
 */
export function NotesInput({ value, onChange, readNotes }: { value: string; onChange: (text: string) => void; readNotes: (input: unknown) => Promise<ActionResult<{ text: string }>> }) {
  const files = useRef<HTMLInputElement>(null);
  const camera = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reading, setReading] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const add = (picked: FileList | null) => {
    if (!picked?.length) return;
    const list = Array.from(picked);
    setMessage(null);
    startTransition(async () => {
      let text = value;
      const scans: NoteFile[] = [];
      const problems: string[] = [];
      for (const file of list) {
        setReading(file.name || "photo");
        const read = await readNoteFile(file);
        if (!read.ok) problems.push(`${read.name}: ${read.message}`);
        else if (read.kind === "text") text = `${text.trim() ? `${text.trim()}\n\n` : ""}— ${read.name} —\n${read.text}`;
        else scans.push(read.file);
      }
      if (scans.length > NOTE_FILES_MAX) {
        problems.push(`Add up to ${NOTE_FILES_MAX} photos or PDFs at a time. The first ${NOTE_FILES_MAX} were read.`);
        scans.length = NOTE_FILES_MAX;
      }
      if (scans.length && !scansFit(scans)) {
        problems.push("Those photos are too big together. Add fewer at a time.");
        scans.length = 0;
      }
      if (scans.length) {
        setReading(scans.length === 1 ? scans[0]!.name : `${scans.length} files`);
        const result = await readNotes({ files: scans });
        if (result.ok) text = `${text.trim() ? `${text.trim()}\n\n` : ""}— read from ${scans.length === 1 ? scans[0]!.name : `${scans.length} photos or PDFs`} —\n${result.data.text.trim()}`;
        else problems.push(result.error);
      }
      setReading(null);
      onChange(text.slice(0, NOTES_MAX + 200));
      setMessage(problems.length ? problems.join(" ") : text !== value ? "Added to your notes. Read it and fix anything that’s wrong before you generate." : null);
    });
  };

  const tooLong = value.length > NOTES_MAX;
  return (
    <div className="grid gap-2">
      <TextAreaField
        label="Lesson notes (optional)"
        rows={6}
        placeholder="Type or paste your notes here, or add a file or photos below."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={tooLong ? `Use at most ${NOTES_MAX.toLocaleString("en-GB")} characters. Cut some, or generate in parts.` : undefined}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={() => files.current?.click()}>
          Add a file or photos
        </Button>
        <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={() => camera.current?.click()}>
          Take a photo
        </Button>
        <span className="ml-auto text-[12.5px] text-text-secondary">
          {value.length.toLocaleString("en-GB")} / {NOTES_MAX.toLocaleString("en-GB")}
        </span>
      </div>
      <input ref={files} type="file" multiple accept=".docx,.txt,.md,.pdf,image/*" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => (add(e.target.files), (e.target.value = ""))} />
      <input ref={camera} type="file" accept="image/*" capture="environment" className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => (add(e.target.files), (e.target.value = ""))} />
      {reading && (
        <p role="status" className="flex items-center gap-2 text-sm text-text-secondary">
          <Spinner className="h-4 w-4" /> Reading {reading}… photos can take up to 30 seconds.
        </p>
      )}
      {message && !reading && (
        <p role="status" className="text-sm text-text-secondary">
          {message}
        </p>
      )}
      <p className="text-[12.5px] text-text-secondary">Word (.docx) and text files are read on your device. Photos and PDFs are read by AI, then thrown away: we don’t keep them. Leave out student names.</p>
    </div>
  );
}
