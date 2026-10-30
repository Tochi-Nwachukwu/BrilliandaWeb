// Lesson notes in the browser (the question generator): Word and text files are read here, so
// only their text leaves the device; photos are shrunk, and photos and PDFs go to the server to be
// read by the model (a photo of handwriting can't be read in the browser). Nothing is kept.
import { NOTE_FILES_CHARS } from "@brillianda/core/questions";
import { readDocxText } from "@/lib/import/readFile";

export type NoteFile = { name: string; dataUrl: string };
export type PickedNote = { ok: true; kind: "text"; name: string; text: string } | { ok: true; kind: "scan"; file: NoteFile } | { ok: false; name: string; message: string };

const PDF_MAX_BYTES = 2 * 1024 * 1024;
const PHOTO_SIDE = 1600;

/** The whole picture, at most 1600 px on the long side, as a JPEG. Phone photos are 3 to 8 MB otherwise. */
async function shrinkPhoto(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, PHOTO_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext("2d")!;
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.75);
}

const toDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

/** One picked file: its text (Word, text), or a photo or PDF ready to be read, or why it can't be used. */
export async function readNoteFile(file: File): Promise<PickedNote> {
  const name = file.name || "Photo";
  const lower = name.toLowerCase();
  const fail = (message: string): PickedNote => ({ ok: false, name, message });
  try {
    if (lower.endsWith(".docx")) {
      const text = (await readDocxText(await file.arrayBuffer())).trim();
      return text ? { ok: true, kind: "text", name, text } : fail("There’s no text in this Word document.");
    }
    if (lower.endsWith(".txt") || lower.endsWith(".md") || file.type === "text/plain") {
      const text = (await file.text()).trim();
      return text ? { ok: true, kind: "text", name, text } : fail("This file is empty.");
    }
    if (lower.endsWith(".doc")) return fail("This is an old Word file (.doc). Open it in Word, choose Save As, pick Word Document (.docx), and add that.");
    if (lower.endsWith(".pdf") || file.type === "application/pdf") {
      if (file.size > PDF_MAX_BYTES) return fail("This PDF is over 2 MB. Add fewer pages, or photograph them instead.");
      return { ok: true, kind: "scan", file: { name, dataUrl: await toDataUrl(file) } };
    }
    if (file.type.startsWith("image/")) return { ok: true, kind: "scan", file: { name, dataUrl: await shrinkPhoto(file) } };
    return fail("Add a photo, a PDF, or a Word (.docx) or text file.");
  } catch {
    return fail("We couldn’t read this file. Try saving it again, or paste the text instead.");
  }
}

/** Do these photos and PDFs fit in one request? */
export const scansFit = (files: NoteFile[]) => files.reduce((n, f) => n + f.dataUrl.length, 0) <= NOTE_FILES_CHARS;
