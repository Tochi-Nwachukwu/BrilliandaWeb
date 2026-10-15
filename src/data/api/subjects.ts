// Subjects on the Brillianda API. Same functions and shapes as ../fake/subjects.ts. The catalogue
// comes from the API too (the same 57 entries as ours).
import "server-only";
import type { Department } from "@brillianda/core/classes";
import type { LinkKind } from "@brillianda/core/subjects";
import type { ActionResult, SubjectsSetup } from "../types";
import { api, fail, read } from "./client";

const id = encodeURIComponent;

export async function getSubjectsSetup(subdomain: string): Promise<SubjectsSetup | null> {
  return read<SubjectsSetup>(subdomain, "/v1/subjects");
}

export async function addSubjects(subdomain: string, catalogueIds: string[], custom: { name: string; code: string }[]): Promise<ActionResult<{ added: number }>> {
  const result = await api<{ added: number }>(subdomain, "/v1/subjects", { method: "POST", body: { catalogueIds, custom } });
  return result.ok ? { ok: true, data: result.data } : fail(result);
}

async function done(subdomain: string, path: string, method: "PATCH" | "PUT" | "DELETE", body?: unknown): Promise<ActionResult<null>> {
  const result = await api(subdomain, path, { method, body });
  return result.ok ? { ok: true, data: null } : fail(result);
}

export async function renameSubject(subdomain: string, subjectId: string, name: string, code: string): Promise<ActionResult<null>> {
  return done(subdomain, `/v1/subjects/${id(subjectId)}`, "PATCH", { name, code });
}

export async function removeSubject(subdomain: string, subjectId: string): Promise<ActionResult<null>> {
  return done(subdomain, `/v1/subjects/${id(subjectId)}`, "DELETE");
}

export async function setSubjectLink(subdomain: string, subjectId: string, levelId: string, kind: LinkKind | null): Promise<ActionResult<null>> {
  return done(subdomain, `/v1/subjects/${id(subjectId)}/levels/${id(levelId)}`, "PUT", { kind });
}

export async function setSubjectDepartment(subdomain: string, subjectId: string, department: Department | null): Promise<ActionResult<null>> {
  return done(subdomain, `/v1/subjects/${id(subjectId)}/department`, "PUT", { department });
}
