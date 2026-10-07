"use client";

import { useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cx } from "./cx";
import { Backdrop, CloseButton, useModalFocus } from "./Overlay";

/**
 * Create, edit and confirm, one component for both sizes (plan: "One component, two layouts").
 * - Phone: a bottom sheet up to nearly full height, with the footer (Save) stuck to its bottom.
 * - Laptop: a centred dialog, or a side panel from the right with `laptop="panel"`.
 * Same look as the old app's Dialog and SidePanel; focus is trapped and Escape closes.
 */
export function ResponsiveDialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  laptop = "dialog",
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  /** Actions that stay in view while the content scrolls: Save, Cancel. */
  footer?: ReactNode;
  laptop?: "dialog" | "panel";
  width?: number;
}) {
  const ref = useModalFocus(open, onClose);
  const titleId = useId();
  if (!open) return null;

  const panel = laptop === "panel";
  return createPortal(
    <>
      <Backdrop onClose={onClose} />
      <div
        className={cx(
          "pointer-events-none fixed inset-0 z-50 flex items-end justify-center",
          panel ? "md:items-stretch md:justify-end md:p-3" : "md:items-center md:p-3",
        )}
      >
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={cx(
            "pointer-events-auto flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[26px] bg-bg shadow-float",
            "animate-[sheet-up_450ms_cubic-bezier(0.3,1.15,0.5,1)]",
            panel
              ? "md:max-h-none md:w-[420px] md:rounded-[26px] md:animate-[sheet-in_450ms_cubic-bezier(0.3,1.15,0.5,1)]"
              : "md:max-h-[calc(100dvh-32px)] md:max-w-[var(--dialog-width)] md:rounded-[26px] md:animate-pop",
          )}
          style={{ ["--dialog-width" as string]: `${width}px` }}
        >
          {/* A grab handle tells a phone user the sheet can be closed by going back down. */}
          <span aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-border-strong md:hidden" />
          <div className="grid min-h-0 flex-1 content-start gap-5 overflow-y-auto px-5 pb-5 pt-3 md:p-6">
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
          {footer && (
            <div className="flex flex-wrap justify-end gap-2 border-t border-divider bg-bg px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3 md:px-6 md:pb-6 [&>*]:max-md:flex-1">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
