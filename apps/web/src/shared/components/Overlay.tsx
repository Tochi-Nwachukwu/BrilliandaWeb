import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cx } from "../utils/cx";
import { Icon } from "./Icon";

/** Focus moves in on open and back to where it was on close; Escape closes; Tab stays inside. */
function useModalFocus(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!open) return;
    const before = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const focusables = () =>
      [...(node?.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea, [tabindex]:not([tabindex='-1'])") ?? [])].filter(
        (el) => !el.hasAttribute("disabled"),
      );
    (node?.querySelector<HTMLElement>("[data-autofocus]") ?? focusables()[0])?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close.current();
      } else if (event.key === "Tab") {
        const list = focusables();
        if (!list.length) return;
        const first = list[0]!, last = list[list.length - 1]!;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      before?.focus?.();
    };
  }, [open]);

  return ref;
}

function Backdrop({ onClose }: { onClose: () => void }) {
  return <div aria-hidden onClick={onClose} className="fixed inset-0 z-40 animate-[fade-in_200ms_ease-out] bg-[rgba(35,30,54,0.32)] backdrop-blur-[3px]" />;
}

export function CloseButton({ onClick, label = "Close" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-raise shadow-raised transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
        <path d="M6 6l12 12M18 6L6 18" />
      </svg>
    </button>
  );
}

/** A centred dialog for a decision or a short form. */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  width?: number;
}) {
  const ref = useModalFocus(open, onClose);
  const titleId = useId();
  if (!open) return null;
  return createPortal(
    <>
      <Backdrop onClose={onClose} />
      {/* Centred by layout, not a transform, so the entrance animation can't knock it off centre. */}
      <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center p-3">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="pointer-events-auto grid max-h-[calc(100dvh-32px)] w-full animate-pop gap-5 overflow-y-auto rounded-[26px] bg-bg p-6 shadow-float"
        style={{ maxWidth: width }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-[22px] font-medium leading-tight tracking-[-0.025em]">
              {title}
            </h2>
            {description && <div className="mt-1.5 text-sm leading-relaxed text-text-secondary">{description}</div>}
          </div>
          <CloseButton onClick={onClose} />
        </div>
        {children}
      </div>
      </div>
    </>,
    document.body,
  );
}

/** A panel that slides in from the right (from the bottom on phones) for an item's details. */
export function SidePanel({ open, onClose, label, children }: { open: boolean; onClose: () => void; label: string; children: ReactNode }) {
  const ref = useModalFocus(open, onClose);
  if (!open) return null;
  return createPortal(
    <>
      <Backdrop onClose={onClose} />
      <aside
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={cx(
          "fixed z-50 flex flex-col gap-4 overflow-y-auto bg-bg p-5 shadow-float",
          "inset-x-2 bottom-2 max-h-[86dvh] animate-[sheet-up_450ms_cubic-bezier(0.3,1.15,0.5,1)] rounded-[26px]",
          "sm:inset-x-auto sm:bottom-3 sm:right-3 sm:top-3 sm:max-h-none sm:w-[400px] sm:animate-[sheet-in_450ms_cubic-bezier(0.3,1.15,0.5,1)]",
        )}
      >
        <div className="flex justify-start">
          <CloseButton onClick={onClose} label="Back" />
        </div>
        {children}
      </aside>
    </>,
    document.body,
  );
}

/** The heading block at the top of a side panel: a coloured tile, a title and one line. */
export function PanelTitle({ icon, title, children, tint }: { icon: Parameters<typeof Icon>[0]["name"]; title: ReactNode; children?: ReactNode; tint?: { bg: string; fg: string } }) {
  return (
    <div className="grid justify-items-center gap-1 text-center">
      <span className="mb-1.5 grid h-14 w-14 place-items-center rounded-2xl" style={{ background: tint?.bg ?? "var(--color-accent-soft)", color: tint?.fg ?? "var(--color-accent)" }}>
        <Icon name={icon} className="h-[26px] w-[26px]" />
      </span>
      <h2 className="text-[22px] font-medium tracking-[-0.025em]">{title}</h2>
      {children && <p className="text-sm text-text-secondary">{children}</p>}
    </div>
  );
}
