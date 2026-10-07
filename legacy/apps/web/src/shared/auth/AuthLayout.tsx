import type { ReactNode } from "react";
import { Alert } from "../components/Alert";
import { cx } from "../utils/cx";

// Where the wordmark leads. The marketing site lives at its own address in production.
const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined) || "/";

type AuthLayoutProps = {
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
};

function Wordmark({ className }: { className?: string }) {
  return (
    <a
      href={SITE_URL}
      className={cx(
        "inline-flex items-center gap-2 rounded font-display text-xl font-medium tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        className,
      )}
    >
      <span aria-hidden className="h-2 w-2 rounded-full bg-accent" />
      Brillanda
    </a>
  );
}

// What the product does, in the order it happens. No figures: nothing here is a statistic, and a
// sign-in screen is the wrong place for a number nobody can check.
const STEPS = [
  { title: "Teachers enter scores", detail: "One subject at a time, from a phone or a laptop." },
  { title: "Brillanda does the sums", detail: "Totals, grades and positions, worked out for you." },
  { title: "Parents read the result", detail: "On their phone, once the school publishes." },
];

/** Wide screens only. Everything on it is CSS and text, so it costs nothing to load. */
function BrandPanel() {
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col justify-between overflow-y-auto bg-panel p-12 text-primary-text lg:flex">
      <Wordmark className="self-start focus-visible:ring-offset-panel" />

      <div>
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-panel-accent">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-panel-accent" />
          For Nigerian schools
        </p>
        <p className="mt-5 max-w-[15em] font-display text-[40px] font-medium leading-[1.1] tracking-tight">
          The term’s results, without the long night of adding up.
        </p>
        <ol className="mt-12 space-y-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className={cx(
                "flex max-w-[22rem] items-center gap-4 rounded-xl border border-panel-edge bg-panel-raised p-4",
                index === 1 && "ml-10",
                index === 2 && "ml-20",
              )}
            >
              <span
                aria-hidden
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-panel-edge font-display text-base font-medium text-panel-accent"
              >
                {index + 1}
              </span>
              <span>
                <span className="block text-sm font-medium">{step.title}</span>
                <span className="mt-0.5 block text-sm text-panel-muted">{step.detail}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <p className="text-sm text-panel-muted">© {new Date().getFullYear()} Brillanda</p>
    </aside>
  );
}

/**
 * The frame for sign in, invites and password resets (design/patterns/auth.md). Under 1024px it is
 * one centred card; from there up it is a brand panel beside the form, and the card drops its box.
 */
export function AuthLayout({ title, description, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[5fr_7fr]">
      <BrandPanel />
      <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12 lg:px-16">
        <div className="w-full max-w-[400px] animate-rise">
          <p className="mb-10 text-center lg:hidden">
            <Wordmark />
          </p>
          <div className="rounded-xl border border-edge bg-surface p-6 shadow-raised sm:p-8 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
            <h1 className="font-display text-[26px] font-medium leading-tight tracking-tight lg:text-[32px]">{title}</h1>
            {description && <div className="mt-2 space-y-2 text-sm leading-relaxed text-text-secondary">{description}</div>}
            {children && <div className="mt-8">{children}</div>}
          </div>
          {footer && <div className="mt-6 text-center text-sm text-text-secondary lg:text-left">{footer}</div>}
        </div>
      </main>
    </div>
  );
}

/**
 * The one place a form's general error appears, just above its button. It opens by growing rather
 * than appearing, so the button moves out from under a finger instead of jumping (§9).
 */
export function FormError({ message }: { message: string | null }) {
  return (
    <div
      className={cx(
        "grid transition-[grid-template-rows,opacity] duration-150 ease-out",
        message ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="overflow-hidden">{message && <div className="pb-4"><Alert tone="danger">{message}</Alert></div>}</div>
    </div>
  );
}

export const authLinkClass =
  "rounded font-medium text-text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";

export function TextButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={authLinkClass}>
      {children}
    </button>
  );
}
