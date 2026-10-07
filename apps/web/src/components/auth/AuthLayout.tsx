import { cx } from "@brillianda/ui";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { brandPalette, mix } from "@brillianda/core";
import type { ReactNode } from "react";
import { SchoolMark } from "../school/SchoolBrand";

export type AuthSchool = { name: string; logoUrl: string | null; brandColor: string };

// The frame for signup, sign in, invites and password resets (from the old app's AuthLayout).
// Under 1024px it is one centred card; from there up it is a brand panel beside the form.

async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

export function AuthWordmark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cx(
        "inline-flex items-center gap-2 rounded font-display text-xl font-medium tracking-tight focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
        className,
      )}
    >
      <span aria-hidden className="h-2 w-2 rounded-full bg-accent" />
      Brillianda
    </Link>
  );
}

// What the product does, in the order it happens. No figures: nothing here is a statistic.
const STEPS = [
  { title: "Teachers enter scores", detail: "One subject at a time, from a phone or a laptop." },
  { title: "Brillianda does the sums", detail: "Totals, grades and positions, worked out for you." },
  { title: "Parents read the result", detail: "On their phone, once the school publishes." },
];

/** Wide screens only. Everything on it is CSS and text, so it costs nothing to load. */
async function BrandPanel() {
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col justify-between overflow-y-auto bg-panel p-12 text-primary-text lg:flex">
      <AuthWordmark className="self-start focus-visible:ring-offset-panel" />

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

      <p className="text-sm text-panel-muted">© {await currentYear()} Brillianda</p>
    </aside>
  );
}

/** A school's own sign-in panel: its colour, its mark and its name, instead of ours. */
async function SchoolPanel({ school }: { school: AuthSchool }) {
  const p = brandPalette(school.brandColor);
  const muted = mix(p.primaryText, p.primary, 0.28);
  return (
    <aside className="sticky top-0 hidden h-dvh flex-col justify-between overflow-y-auto p-12 lg:flex" style={{ background: p.primary, color: p.primaryText }}>
      <SchoolMark {...school} className="h-12 w-12 text-base shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]" />
      <div>
        <p className="max-w-[12em] font-display text-[40px] font-medium leading-[1.1] tracking-tight">{school.name}</p>
        <p className="mt-4 max-w-[22rem] text-base" style={{ color: muted }}>
          Classes, subjects and students, in one place.
        </p>
      </div>
      <p className="text-sm" style={{ color: muted }}>
        Powered by Brillianda · © {await currentYear()}
      </p>
    </aside>
  );
}

export function AuthLayout({
  title,
  description,
  above,
  children,
  footer,
  school,
}: {
  title: string;
  description?: ReactNode;
  /** Sits over the title inside the card, e.g. the signup steps. */
  above?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** A school's sign-in pages wear its name, mark and colour (plan: per-school sign-in). */
  school?: AuthSchool;
}) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[5fr_7fr]">
      {school ? <SchoolPanel school={school} /> : <BrandPanel />}
      <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12 lg:px-16">
        <div className="w-full max-w-[400px] animate-rise">
          {school ? (
            <div className="mb-8 flex flex-col items-center gap-3 text-center lg:hidden">
              <SchoolMark {...school} className="h-14 w-14 text-lg" />
              <p className="font-display text-xl font-medium tracking-tight">{school.name}</p>
            </div>
          ) : (
            <p className="mb-10 text-center lg:hidden">
              <AuthWordmark />
            </p>
          )}
          <div className="rounded-xl border border-edge bg-surface p-6 shadow-raised sm:p-8 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
            {above}
            <h1 className="font-display text-[26px] font-medium leading-tight tracking-tight lg:text-[32px]">{title}</h1>
            {description && <div className="mt-2 space-y-2 text-sm leading-relaxed text-text-secondary">{description}</div>}
            {children && <div className="mt-8">{children}</div>}
          </div>
          {footer && <div className="mt-6 text-center text-sm text-text-secondary lg:text-left">{footer}</div>}
          {school && (
            <p className="mt-10 text-center text-xs text-text-muted lg:hidden">
              Powered by{" "}
              <Link href="/" className="font-medium text-text-secondary hover:underline">
                Brillianda
              </Link>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

export { authLinkClass } from "./styles";
