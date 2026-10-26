// Birthday messages, on the Brillianda API. Same functions and shapes as ../fake/birthdays.ts.
// The texts themselves go out from the API's daily job; on staging they land in its outbox.
import "server-only";
import type { BirthdaySettings } from "@brillianda/core/birthdays";
import type { ActionResult, BirthdaysPage, BirthdaysThisWeek } from "../types";
import { api, fail, read } from "./client";

export async function getBirthdays(subdomain: string): Promise<BirthdaysPage | null> {
  return read<BirthdaysPage>(subdomain, "/v1/birthdays");
}

export async function getBirthdaysThisWeek(subdomain: string): Promise<BirthdaysThisWeek | null> {
  return read<BirthdaysThisWeek>(subdomain, "/v1/birthdays", { days: 7 });
}

export async function saveBirthdaySettings(subdomain: string, input: BirthdaySettings): Promise<ActionResult<null>> {
  const result = await api(subdomain, "/v1/birthdays/settings", { method: "PUT", body: input });
  return result.ok ? { ok: true, data: null } : fail(result);
}
