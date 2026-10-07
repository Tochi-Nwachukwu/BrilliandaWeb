import type { ReactNode } from "react";

export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl bg-surface px-6 py-14 text-center shadow-raised">
      <div aria-hidden className="mb-3 flex justify-center gap-1.5">
        {[1, 3, 6].map((level, i) => (
          <span key={level} className="h-4 w-4 animate-[bob_1.8s_ease-in-out_infinite] rounded-full" style={{ background: `var(--level-${level}-tint)`, animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
      <p className="text-base font-semibold">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-text-secondary">{children}</p>
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md bg-surface px-1.5 py-0.5 font-sans text-xs font-medium text-text-primary shadow-raised">
      {children}
    </kbd>
  );
}
