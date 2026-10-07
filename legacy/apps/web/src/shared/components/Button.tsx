import type { ButtonHTMLAttributes } from "react";
import { cx } from "../utils/cx";
import { Spinner } from "./Spinner";

// One solid primary button per screen section; everything else secondary or ghost (Build Guide §6).
const VARIANTS = {
  primary: "bg-primary text-primary-text hover:bg-primary-hover",
  secondary: "bg-raise text-text-primary shadow-raised hover:bg-hover disabled:text-text-muted",
  ghost: "text-text-secondary hover:bg-hover hover:text-text-primary disabled:text-text-muted",
  // For the one irreversible-feeling action in a dialog (suspending a school).
  danger: "bg-danger text-primary-text hover:brightness-95",
  // A quiet way into that action, e.g. from a details panel.
  "danger-quiet": "text-danger hover:bg-danger-bg disabled:text-text-muted",
  // On the page greeting: a see-through tint of the greeting's own text colour, so it works on
  // the pastel greeting and the black Neutral one alike.
  soft: "bg-[color-mix(in_oklab,var(--hero-text)_10%,transparent)] text-[color:var(--hero-text)] hover:bg-[color-mix(in_oklab,var(--hero-text)_16%,transparent)]",
};

// Pills throughout (the Pastel prototype). `lg` is the sign-in screens' full-width button.
const SIZES = {
  sm: "min-h-[34px] rounded-full px-3.5 text-[13px]",
  md: "min-h-[42px] rounded-full px-5",
  lg: "min-h-[46px] rounded-full px-5",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  loading?: boolean;
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cx(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-[background-color,transform,color] duration-200",
        "hover:-translate-y-px active:translate-y-0 disabled:hover:translate-y-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed",
        SIZES[size],
        VARIANTS[variant],
        // A solid button that is merely unavailable goes grey; one that is working keeps its
        // colour and shows the spinner, so it reads as "in progress", not "broken".
        (variant === "primary" || variant === "danger") && !loading && "disabled:bg-border-strong",
        loading && "cursor-progress",
        className,
      )}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" onSolid />}
      {children}
    </button>
  );
}
