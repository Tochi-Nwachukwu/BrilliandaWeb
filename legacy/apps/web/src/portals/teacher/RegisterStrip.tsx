import { useEffect, useState } from "react";
import { cx } from "../../shared/utils/cx";

const MAX_MARKS = 80;

/**
 * One mark per student, filled once all of that student's scores are in: the class register at
 * a glance. The marks fill in left to right the first time the strip appears.
 */
export function RegisterStrip({ total, filled, delayMs = 0 }: { total: number; filled: number; delayMs?: number }) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (typeof requestAnimationFrame !== "function") {
      setRevealed(true);
      return;
    }
    const frame = requestAnimationFrame(() => setRevealed(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  // Very large classes keep the strip readable by letting each mark stand for a few students.
  const marks = Math.min(total, MAX_MARKS);
  const filledMarks = total > MAX_MARKS ? Math.round((filled / total) * MAX_MARKS) : filled;

  return (
    <div aria-hidden className="flex h-5 items-stretch gap-[2px]">
      {Array.from({ length: marks }, (_, index) => (
        <span
          key={index}
          className={cx(
            "w-1.5 min-w-[2px] shrink rounded-[2px] transition-colors duration-300 ease-out",
            revealed && index < filledMarks ? "bg-primary" : "bg-border",
          )}
          style={{ transitionDelay: revealed ? `${delayMs + index * 18}ms` : undefined }}
        />
      ))}
    </div>
  );
}
