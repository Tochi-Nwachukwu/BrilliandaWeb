import { useEffect, useRef, useState, type ReactNode } from "react";
import { cx } from "../utils/cx";

const GAP = 14;

/**
 * One item at a time, with arrows and dots. The track is a native scroll-snap row, so swiping,
 * trackpads and the keyboard all work; the buttons just scroll it.
 */
export function Carousel({ label, children }: { label: string; children: ReactNode[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = children.length;

  useEffect(() => {
    const node = track.current;
    if (!node) return;
    const onScroll = () => {
      const step = (node.firstElementChild as HTMLElement | null)?.offsetWidth ?? 1;
      setIndex(Math.round(node.scrollLeft / (step + GAP)));
    };
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, []);

  const go = (to: number) => {
    const node = track.current;
    if (!node) return;
    const step = (node.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0;
    const target = Math.max(0, Math.min(count - 1, to));
    setIndex(target);
    const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollTo?.({ left: target * (step + GAP), behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div role="region" aria-roledescription="carousel" aria-label={label} className="grid gap-3">
      <div ref={track} className="grid snap-x snap-mandatory auto-cols-[100%] grid-flow-col overflow-x-auto [scrollbar-width:none]" style={{ gap: GAP }}>
        {children.map((child, i) => (
          <div key={i} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${count}`} className="grid min-w-0 snap-start">
            {child}
          </div>
        ))}
      </div>
      {count > 1 && (
        <div className="flex items-center justify-between gap-3">
          <ArrowButton label="Previous" disabled={index <= 0} onClick={() => go(index - 1)} flip />
          <div className="flex gap-1.5">
            {children.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show ${i + 1} of ${count}`}
                aria-current={i === index || undefined}
                onClick={() => go(i)}
                className={cx("h-[7px] rounded-full transition-[width,background-color] duration-300", i === index ? "w-[22px] bg-primary" : "w-[7px] bg-border-strong")}
              />
            ))}
          </div>
          <ArrowButton label="Next" disabled={index >= count - 1} onClick={() => go(index + 1)} />
        </div>
      )}
    </div>
  );
}

function ArrowButton({ label, disabled, onClick, flip }: { label: string; disabled: boolean; onClick: () => void; flip?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid h-[34px] w-[34px] place-items-center rounded-full bg-sunken transition-opacity hover:bg-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-30"
    >
      <svg viewBox="0 0 24 24" className={cx("h-4 w-4", flip && "rotate-180")} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M9 6l6 6-6 6" />
      </svg>
    </button>
  );
}
