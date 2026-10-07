import type { CSSProperties } from "react";

/**
 * Each class level (JSS 1 to SS 3) has its own colour: a pastel tint for surfaces, a deep ink for
 * text on that tint, and a mid tone for marks such as progress bars. The values live in
 * tokens.css, so the Neutral look can turn them all grey.
 */
export type LevelStyle = CSSProperties & { "--tint": string; "--deep": string; "--mid": string };

export function levelStyle(level: number): LevelStyle {
  const n = (((level % 6) + 6) % 6) + 1;
  return { "--tint": `var(--level-${n}-tint)`, "--deep": `var(--level-${n}-deep)`, "--mid": `var(--level-${n}-mid)` };
}

/** "JSS 1A" is level 0, "JSS 3B" level 2, "SS 1A" level 3. Anything unrecognised gets level 0. */
export function levelOfArm(armName: string): number {
  const match = /^\s*(JSS|SS)\s*(\d)/i.exec(armName);
  if (!match) return 0;
  const year = Number(match[2]) - 1;
  return match[1]!.toUpperCase() === "JSS" ? year : 3 + year;
}
