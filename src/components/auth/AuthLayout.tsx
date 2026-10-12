import { cx } from "@brillianda/ui/cx";
import Link from "next/link";
import { cacheLife } from "next/cache";
import { brandPalette, mix } from "@brillianda/core/brand";
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
  { title: "Your school gets its address", detail: "Four short steps, and it’s yours." },
  { title: "Classes and subjects in minutes", detail: "Two answers make the whole class list." },
  { title: "Every student, in one place", detail: "Import your list from Excel or Word." },
];

/** Where each card floats over the photo, and how its drift is timed. Scattered, not a staircase. */
const FLOAT = [
  { at: "left-0 top-[4%]", motion: "[animation-duration:7s]" },
  { at: "right-0 top-[38%]", motion: "[animation-delay:-2.4s] [animation-duration:8s]" },
  { at: "left-[6%] bottom-[2%]", motion: "[animation-delay:-4.6s] [animation-duration:9s]" },
];

/**
 * Wide screens only. The school courtyard photo, faded into the panel colour, with the three steps
 * floating over it. A CSS background, so phones (which never show the panel) never download it.
 */
async function BrandPanel() {
  return (
    <aside className="sticky top-0 isolate hidden h-dvh flex-col overflow-hidden bg-panel p-12 text-primary-text lg:flex">
      <div aria-hidden className="absolute inset-0 -z-20 bg-cover bg-center opacity-45" style={{ backgroundImage: "url(/photos/school-courtyard-736.webp)" }} />
      {/* Darker at the top and bottom, where the words are. */}
      <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--color-panel)_70%,transparent),transparent_30%,transparent_55%,color-mix(in_oklab,var(--color-panel)_92%,transparent)_85%)]" />

      <AuthWordmark className="self-start focus-visible:ring-offset-panel" />

      <ol className="relative my-8 min-h-[300px] flex-1">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className={cx(
              "absolute flex w-[min(21rem,82%)] animate-[bob_7s_ease-in-out_infinite] items-center gap-4 rounded-2xl border border-white/15 bg-[color-mix(in_oklab,var(--color-panel)_62%,transparent)] p-4 shadow-[0_24px_48px_-24px_rgba(0,0,0,0.6)] backdrop-blur-md",
              FLOAT[index]!.at,
              FLOAT[index]!.motion,
            )}
          >
            <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/20 font-display text-base font-medium text-panel-accent">
              {index + 1}
            </span>
            <span>
              <span className="block text-sm font-medium">{step.title}</span>
              <span className="mt-0.5 block text-sm text-[color-mix(in_oklab,var(--color-primary-text)_80%,transparent)]">{step.detail}</span>
            </span>
          </li>
        ))}
      </ol>

      <div>
        <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-panel-accent">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-panel-accent" />
          For Nigerian schools
        </p>
        <p className="mt-4 max-w-[15em] font-display text-[40px] font-medium leading-[1.1] tracking-tight">Your whole school, set up in an afternoon.</p>
        <p className="mt-8 text-sm text-[color-mix(in_oklab,var(--color-primary-text)_78%,transparent)]">© {await currentYear()} Brillianda</p>
      </div>
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
    <div className="min-h-dvh lg:grid lg:grid-cols-[6fr_7fr]">
      {school ? <SchoolPanel school={school} /> : <BrandPanel />}
      <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-12 lg:px-16">
        <div className="w-full max-w-[400px] animate-lift">
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
