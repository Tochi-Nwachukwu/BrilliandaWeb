import { useEffect, useRef, useState } from "react";

function canAnimate(): boolean {
  const reduced =
    typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return typeof requestAnimationFrame === "function" && !reduced;
}

/**
 * Counts up to `value` when it first appears and eases to any new value after that. Screen
 * readers (and tests) get the final number straight away.
 */
export function AnimatedNumber({ value, durationMs = 900 }: { value: number; durationMs?: number }) {
  const [shown, setShown] = useState(() => (canAnimate() ? 0 : value));
  const current = useRef(shown);

  useEffect(() => {
    if (!canAnimate()) {
      current.current = value;
      setShown(value);
      return;
    }
    const origin = current.current;
    const start = performance.now();
    let frame = requestAnimationFrame(function step(now) {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      current.current = Math.round(origin + (value - origin) * eased);
      setShown(current.current);
      if (progress < 1) frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return (
    <>
      <span aria-hidden className="tabular-nums">
        {shown}
      </span>
      <span className="sr-only">{value}</span>
    </>
  );
}
