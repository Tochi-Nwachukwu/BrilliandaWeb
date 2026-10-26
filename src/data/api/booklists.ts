// Book lists, on the Brillianda API. Same functions and shapes as ../fake/booklists.ts.
import "server-only";
import type { BookItem } from "@brillianda/core/booklists";
import type { ActionResult, BookListsPage } from "../types";
import { api, fail, read } from "./client";

const id = encodeURIComponent;

export async function getBookLists(subdomain: string, startYear?: number): Promise<BookListsPage | null> {
  return read<BookListsPage>(subdomain, "/v1/book-lists", { session: startYear });
}

export async function saveBookList(subdomain: string, levelId: string, startYear: number, items: (BookItem & { id?: string })[]): Promise<ActionResult<null>> {
  const result = await api(subdomain, `/v1/book-lists/${startYear}/${id(levelId)}`, { method: "PUT", body: { items } });
  return result.ok ? { ok: true, data: null } : fail(result);
}

export async function setBookListShared(subdomain: string, levelId: string, startYear: number, shared: boolean): Promise<ActionResult<null>> {
  const result = await api(subdomain, `/v1/book-lists/${startYear}/${id(levelId)}/shared`, { method: "PUT", body: { shared } });
  return result.ok ? { ok: true, data: null } : fail(result);
}
