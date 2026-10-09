import { checkWith } from "@brillianda/core/signup";
import { firstErrors, type Errors } from "./form";

/** Check a screen in the browser with the same schema the server uses: its errors, or null. */
export function errorsFor(schema: Parameters<typeof checkWith>[0], values: unknown): Errors | null {
  const result = checkWith(schema, values);
  return result.ok ? null : firstErrors(result.fieldErrors);
}
