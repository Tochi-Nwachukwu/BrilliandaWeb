"use client";

import { Button } from "@brillianda/ui/Button";
import { cx } from "@brillianda/ui/cx";
import { Icon } from "@brillianda/ui/Icon";
import { useModalFocus } from "@brillianda/ui/Overlay";
import { ResponsiveDialog } from "@brillianda/ui/ResponsiveDialog";
import { TextField } from "@brillianda/ui/TextField";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { HelpGuide, HelpItem, TourStep } from "./guides";

// The Help button in the shell's top bar, its panel of questions, and the guide pop-ups.
// The tour starts by itself the first time someone opens a dashboard on a device; that it was
// seen (finished or skipped) is a per-device convenience, so it lives in localStorage.

const seenKey = (id: string) => `brillianda:tour:${id}`;

function tourSeen(id: string) {
  try {
    return window.localStorage.getItem(seenKey(id)) === "seen";
  } catch {
    return true; // No storage (a private window, a preview): don't keep showing it.
  }
}

function markTourSeen(id: string) {
  try {
    window.localStorage.setItem(seenKey(id), "seen");
  } catch {
    // Nothing to do: it shows again next time.
  }
}

/** Opens Help from elsewhere, e.g. the command palette. */
const OPEN_HELP = "brillianda:help";
const START_TOUR = "brillianda:tour";
export const openHelp = () => window.dispatchEvent(new Event(OPEN_HELP));
export const startTour = () => window.dispatchEvent(new Event(START_TOUR));

export function Help({ guide }: { guide: HelpGuide }) {
  const [panel, setPanel] = useState(false);
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    const onHelp = () => setPanel(true);
    const onTour = () => {
      setPanel(false);
      setStep(0);
    };
    window.addEventListener(OPEN_HELP, onHelp);
    window.addEventListener(START_TOUR, onTour);
    // First visit on this device: wait for the page to settle, then start.
    const timer = tourSeen(guide.id) ? undefined : window.setTimeout(() => setStep(0), 700);
    return () => {
      window.removeEventListener(OPEN_HELP, onHelp);
      window.removeEventListener(START_TOUR, onTour);
      window.clearTimeout(timer);
    };
  }, [guide.id]);

  const endTour = useCallback(() => {
    markTourSeen(guide.id);
    setStep(null);
  }, [guide.id]);

  return (
    <>
      <button
        type="button"
        data-tour="help"
        onClick={() => setPanel(true)}
        aria-label="Help"
        className="grid h-11 w-11 place-items-center rounded-full text-text-secondary transition-colors hover:bg-hover hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
      >
        <Icon name="help" className="h-5 w-5" />
      </button>
      <HelpPanel
        guide={guide}
        open={panel}
        onClose={() => setPanel(false)}
        onTour={() => {
          setPanel(false);
          setStep(0);
        }}
      />
      {step !== null && <Tour steps={guide.tour} step={step} onStep={setStep} onEnd={endTour} />}
    </>
  );
}

/** Whether a question belongs to the page: its path or anything below it. The dashboard home matches only itself. */
function onPage(item: HelpItem, pathname: string, home: string) {
  return (item.pages ?? []).some((p) => pathname === p || (p !== home && pathname.startsWith(`${p}/`)));
}

function matches(item: HelpItem, query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const text = `${item.q} ${item.a}`.toLowerCase();
  return words.every((w) => text.includes(w));
}

function HelpPanel({ guide, open, onClose, onTour }: { guide: HelpGuide; open: boolean; onClose: () => void; onTour: () => void }) {
  return (
    <ResponsiveDialog
      open={open}
      onClose={onClose}
      laptop="panel"
      title="Help"
      description="Answers to common questions, and where to find things."
      footer={
        <div className="grid gap-3">
          <Button variant="secondary" onClick={onTour}>
            Take the tour again
          </Button>
          <p className="text-center text-[13px] text-text-secondary">{guide.stuck}</p>
        </div>
      }
    >
      <HelpBody guide={guide} onGo={onClose} />
    </ResponsiveDialog>
  );
}

/** The panel’s content: mounted each time Help opens, so the search starts empty. */
function HelpBody({ guide, onGo: onClose }: { guide: HelpGuide; onGo: () => void }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const all = guide.topics.flatMap((t) => t.items);
  const here = all.filter((item) => onPage(item, pathname, guide.home));
  const found = query.trim() ? all.filter((item) => matches(item, query)) : null;

  return (
    <div className="grid gap-5">
      <TextField label="Search help" type="search" placeholder="Try “import” or “publish”" value={query} onChange={(e) => setQuery(e.target.value)} />
      {found ? (
        found.length ? (
          <HelpList title={`${found.length === 1 ? "1 answer" : `${found.length} answers`}`} items={found} onGo={onClose} />
        ) : (
          <p className="text-sm text-text-secondary">Nothing matches “{query.trim()}”. Try another word, or browse the topics.</p>
        )
      ) : (
        <>
          {here.length > 0 && <HelpList title="On this page" items={here} onGo={onClose} />}
          {guide.topics.map((topic) => (
            <HelpList key={topic.title} title={topic.title} items={topic.items} onGo={onClose} />
          ))}
        </>
      )}
    </div>
  );
}

function HelpList({ title, items, onGo }: { title: string; items: HelpItem[]; onGo: () => void }) {
  const id = useId();
  const pathname = usePathname();
  return (
    <section aria-labelledby={id}>
      <h3 id={id} className="mb-2 text-[13px] font-semibold text-text-secondary">
        {title}
      </h3>
      <ul className="grid gap-1.5">
        {items.map((item) => (
          <li key={item.q}>
            <details className="group rounded-2xl bg-surface shadow-raised">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-2xl px-4 py-2.5 text-[15px] font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1">{item.q}</span>
                <Icon name="chevron" className="h-4 w-4 shrink-0 text-text-secondary transition-transform group-open:rotate-90 motion-reduce:transition-none" />
              </summary>
              <div className="px-4 pb-4 text-sm leading-relaxed text-text-secondary">
                <p>{item.a}</p>
                {item.href && item.href !== pathname && (
                  <Link href={item.href} onClick={onGo} className="mt-2 inline-flex items-center gap-1 font-semibold text-accent underline underline-offset-2">
                    {item.link ?? "Go there"}
                    <Icon name="chevron" className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
            </details>
          </li>
        ))}
      </ul>
    </section>
  );
}

type Box = { top: number; left: number; width: number; height: number };

/** The step's mark on the page: the first one that's showing (the sidebar on a laptop, the tab bar on a phone). */
function findTarget(step: TourStep): HTMLElement | null {
  if (!step.target) return null;
  const all = document.querySelectorAll<HTMLElement>(`[data-tour="${step.target}"]`);
  return [...all].find((el) => el.getClientRects().length > 0 && el.getBoundingClientRect().width > 0) ?? null;
}

function Tour({ steps, step, onStep, onEnd }: { steps: TourStep[]; step: number; onStep: (n: number) => void; onEnd: () => void }) {
  const ref = useModalFocus(true, onEnd);
  const titleId = useId();
  const bodyId = useId();
  const [box, setBox] = useState<Box | null>(null);
  const [card, setCard] = useState<{ top: number; left: number } | null>(null);
  // Steps whose mark isn't on this screen are skipped, so the count stays honest.
  const shown = useMemo(() => steps.filter((s) => !s.target || typeof document === "undefined" || findTarget(s)), [steps]);
  const current = shown[Math.min(step, shown.length - 1)]!;
  const last = step >= shown.length - 1;

  const measure = useCallback(() => {
    const el = findTarget(current);
    const vw = window.innerWidth,
      vh = window.innerHeight;
    const width = Math.min(340, vw - 32);
    const height = ref.current?.offsetHeight ?? 200;
    if (!el) {
      setBox(null);
      setCard({ top: Math.max(16, (vh - height) / 2), left: (vw - width) / 2 });
      return;
    }
    const r = el.getBoundingClientRect();
    const pad = 6;
    const b = {
      top: r.top - pad,
      left: r.left - pad,
      width: r.width + pad * 2,
      height: r.height + pad * 2,
    };
    setBox(b);
    // Below the mark if it fits, else above it; beside it for a tall sidebar mark that fits neither.
    let top = b.top + b.height + 12;
    if (top + height > vh - 16) top = b.top - height - 12;
    let left = Math.min(Math.max(16, b.left + b.width / 2 - width / 2), vw - width - 16);
    if (top < 16) {
      top = Math.min(Math.max(16, b.top), vh - height - 16);
      left = Math.min(b.left + b.width + 12, vw - width - 16);
    }
    setCard({ top, left });
  }, [current, ref]);

  useLayoutEffect(() => {
    const el = findTarget(current);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el?.scrollIntoView({
      block: "nearest",
      behavior: reduce ? "auto" : "smooth",
    });
    const frame = window.requestAnimationFrame(measure);
    const again = window.setTimeout(measure, 350);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(again);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [current, measure]);

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[data-tour-next]")?.focus();
  }, [step, ref]);

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      {/* Clicks around the tour don't reach the page; Skip or Escape ends it. */}
      <div className="absolute inset-0" style={box ? undefined : { background: "rgb(20 16 32 / 0.45)" }} />
      {box && (
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-2xl ring-2 ring-accent transition-all duration-300 ease-out motion-reduce:transition-none"
          style={{ ...box, boxShadow: "0 0 0 9999px rgb(20 16 32 / 0.45)" }}
        />
      )}
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className={cx(
          "absolute w-[min(340px,calc(100vw-32px))] rounded-3xl bg-surface p-5 shadow-float",
          "transition-[top,left] duration-300 ease-out motion-reduce:transition-none",
          card ? "opacity-100" : "opacity-0",
        )}
        style={card ?? { top: 0, left: 0 }}
      >
        <p className="text-[12.5px] font-medium text-text-secondary">
          {Math.min(step, shown.length - 1) + 1} of {shown.length}
        </p>
        <h2 id={titleId} className="mt-1 text-[17px] font-semibold tracking-[-0.02em]">
          {current.title}
        </h2>
        <p id={bodyId} className="mt-1.5 text-sm leading-relaxed text-text-secondary">
          {current.body}
        </p>
        <div className="mt-4 flex items-center gap-2">
          {!last && (
            <button
              type="button"
              onClick={onEnd}
              className="mr-auto rounded-full px-2 py-2 text-sm font-medium text-text-secondary underline-offset-2 hover:text-text-primary hover:underline focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
            >
              Skip tour
            </button>
          )}
          {step > 0 && (
            <Button variant="secondary" onClick={() => onStep(step - 1)} className={last ? "mr-auto" : undefined}>
              Back
            </Button>
          )}
          <Button data-tour-next onClick={() => (last ? onEnd() : onStep(step + 1))} className={step === 0 && last ? "ml-auto" : undefined}>
            {last ? "Done" : step === 0 ? "Show me" : "Next"}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
