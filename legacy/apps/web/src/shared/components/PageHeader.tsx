import type { ReactNode } from "react";

/** A page's title, one line on what it's for, and its actions on the right. */
export function PageHeader({ title, children, actions }: { title: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <h1 className="text-[32px] font-medium leading-[1.05] tracking-[-0.035em] sm:text-[40px]">{title}</h1>
        {children && <div className="mt-2 max-w-[60ch] text-text-secondary">{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

/** A page that is on its way. Every menu item works; this says honestly what isn't built yet. */
export function ComingNext({ title, portalName, children }: { title: string; portalName: string; children?: ReactNode }) {
  return (
    <>
      <PageHeader title={title} />
      <div className="animate-pop rounded-3xl bg-surface px-6 py-14 text-center shadow-raised">
        <div aria-hidden className="mb-3 flex justify-center gap-1.5">
          {[6, 3, 1].map((level, i) => (
            <span key={level} className="h-4 w-4 animate-[bob_1.8s_ease-in-out_infinite] rounded-full" style={{ background: `var(--level-${level}-tint)`, animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
        <p className="text-base font-semibold">The {portalName} is being built.</p>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-text-secondary">
          {children ?? "This page is on its way. You'll be able to use it here soon."}
        </p>
      </div>
    </>
  );
}
