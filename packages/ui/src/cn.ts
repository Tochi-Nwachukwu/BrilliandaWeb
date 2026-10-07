import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * shadcn/ui's class helper: joins classes and lets a later class override an earlier one
 * (`px-2` then `px-4` keeps `px-4`). For components added with the shadcn CLI. The components
 * moved from the old app keep `cx`, which only joins, so their look can't shift.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
