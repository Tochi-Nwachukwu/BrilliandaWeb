import type { checkWith } from "@brillianda/core/signup";

export type Errors = Record<string, string | undefined>;

/** The first message under each field, from a server's fieldErrors or a failed check. */
export function firstErrors(fieldErrors?: Record<string, string[] | undefined>): Errors {
  return Object.fromEntries(Object.entries(fieldErrors ?? {}).map(([field, messages]) => [field, messages?.[0]]));
}

/**
 * The same check as `errorsFor` (in formCheck.ts), but the schema and the checking library load
 * on the first submit instead of with the page. For the public screens, which have a speed budget.
 */
export async function checkLater(load: () => Promise<Parameters<typeof checkWith>[0]>, values: unknown): Promise<Errors | null> {
  const [schema, { checkWith: check }] = await Promise.all([load(), import("@brillianda/core/signup")]);
  const result = check(schema, values);
  return result.ok ? null : firstErrors(result.fieldErrors);
}
