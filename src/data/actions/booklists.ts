"use server";

// Books and things needed (batch 20; docs/data-contract.md).
import { bookListSchema } from "@brillianda/core/booklists";
import { fieldErrorsOf } from "@brillianda/core/signup";
import * as impl from "../fake/booklists";
import type { ActionResult } from "../types";

/** Replaces a class level's list for a session. Owners and admins. */
export async function saveBookList(school: string, levelId: string, startYear: number, input: unknown): Promise<ActionResult<null>> {
  const parsed = bookListSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the list.", fieldErrors: fieldErrorsOf(parsed.error) };
  const ids = Array.isArray((input as { items?: unknown })?.items) ? (input as { items: { id?: unknown }[] }).items.map((i) => (typeof i?.id === "string" ? i.id : undefined)) : [];
  return impl.saveBookList(String(school), String(levelId), Number(startYear), parsed.data.items.map((item, i) => ({ ...item, id: ids[i] })));
}

/** Shows a list to parents, or stops. Owners and admins. */
export async function setBookListShared(school: string, levelId: string, startYear: number, shared: boolean): Promise<ActionResult<null>> {
  return impl.setBookListShared(String(school), String(levelId), Number(startYear), Boolean(shared));
}
