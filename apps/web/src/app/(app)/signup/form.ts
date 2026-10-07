import { checkWith } from "@brillianda/core";

export type Errors = Record<string, string | undefined>;

/** The first message under each field, from a server's fieldErrors or a failed check. */
export function firstErrors(fieldErrors?: Record<string, string[] | undefined>): Errors {
  return Object.fromEntries(Object.entries(fieldErrors ?? {}).map(([field, messages]) => [field, messages?.[0]]));
}

/** Check a screen in the browser with the same schema the server uses: its errors, or null. */
export function errorsFor(schema: Parameters<typeof checkWith>[0], values: unknown): Errors | null {
  const result = checkWith(schema, values);
  return result.ok ? null : firstErrors(result.fieldErrors);
}
