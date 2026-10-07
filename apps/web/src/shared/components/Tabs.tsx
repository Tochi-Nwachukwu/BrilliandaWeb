import { cx } from "../utils/cx";

/**
 * A row of filters that each show a count, e.g. "All 8 · Active 5". Pressing one filters the list
 * beneath, so they are toggle buttons (aria-pressed), not tabs with separate panels.
 */
export function FilterTabs<T extends string>({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-raise p-1 shadow-raised [scrollbar-width:none]">
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.value)}
            className={cx(
              "inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              active ? "bg-accent-soft font-semibold text-accent" : "text-text-secondary hover:text-text-primary",
            )}
          >
            {item.label}
            {item.count !== undefined && (
              <span
                className={cx(
                  "grid h-5 min-w-[22px] place-items-center rounded-full px-1.5 text-[11.5px] font-semibold tabular-nums",
                  active ? "bg-accent text-primary-text" : "bg-sunken text-text-secondary",
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
