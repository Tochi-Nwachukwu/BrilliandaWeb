import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { levelStyle } from "../theme/levels";
import { cx } from "../utils/cx";
import { Icon, type IconName } from "./Icon";

/** A white card: the one raised surface most sections sit on. */
export function Card({ title, description, action, children, className }: { title?: ReactNode; description?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("min-w-0 rounded-3xl bg-surface p-5 shadow-raised sm:p-6", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-[17px] font-semibold tracking-[-0.02em]">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-text-secondary">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** One figure in a pastel card, linking to where it comes from. `level` picks the tint. */
export function StatCard({ to, icon, label, value, note, level, index = 0 }: { to: string; icon: IconName; label: string; value: ReactNode; note?: string; level: number; index?: number }) {
  return (
    <Link
      to={to}
      className="grid animate-pop gap-4 rounded-[22px] p-[18px] transition-[transform,box-shadow] duration-300 hover:-translate-y-[3px] hover:shadow-float focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      style={{ ...levelStyle(level), background: "var(--tint)", color: "var(--deep)", ["--d" as string]: `${index * 0.05}s` }}
    >
      <span className="flex items-center justify-between gap-2">
        <span aria-hidden className="grid h-[38px] w-[38px] place-items-center rounded-xl bg-[color-mix(in_oklab,var(--color-surface)_72%,transparent)]">
          <Icon name={icon} className="h-[18px] w-[18px]" />
        </span>
        {note && <span className="truncate rounded-full bg-[color-mix(in_oklab,var(--color-surface)_72%,transparent)] px-2.5 py-1 text-xs font-semibold">{note}</span>}
      </span>
      <span>
        <span className="block text-[13.5px] opacity-85">{label}</span>
        <span className="mt-0.5 block text-[34px] font-medium leading-none tracking-[-0.03em] tabular-nums">{value}</span>
      </span>
    </Link>
  );
}

/** A thin bar that grows to its value. `color` is any CSS colour; the track is the sunken tint. */
export function ProgressBar({ value, color = "var(--color-chart)", delay = 0, className }: { value: number; color?: string; delay?: number; className?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <span aria-hidden className={cx("relative block h-2.5 overflow-hidden rounded-full bg-sunken", className)}>
      <span className="absolute inset-y-0 left-0 animate-grow rounded-full" style={{ width: `${pct}%`, background: color, ["--d" as string]: `${delay}s` }} />
    </span>
  );
}
