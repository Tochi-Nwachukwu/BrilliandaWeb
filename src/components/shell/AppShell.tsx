"use client";

import { Badge } from "@brillianda/ui/Badge";
import { CommandPalette, openCommandPalette, type Command } from "@brillianda/ui/CommandPalette";
import { cx } from "@brillianda/ui/cx";
import { Icon, type IconName } from "@brillianda/ui/Icon";
import { Toaster } from "@brillianda/ui/Toast";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { initials } from "@/lib/initials";
import { setLook, useLook, type Look } from "@/lib/look";

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  /** Shorter label for the phone tab bar. */
  short?: string;
  /** Match the path exactly (for a school's Home). */
  exact?: boolean;
  /** A small red count, e.g. requests waiting. */
  count?: number;
};

export type ShellAccount = { fullName: string; roleLabel: string };


function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2.5 text-xl font-semibold tracking-tight", className)}>
      <span aria-hidden className="h-7 w-7 rounded-[9px] shadow-[inset_0_0_0_1px_rgba(35,30,54,0.06)]" style={{ background: "var(--brand-mark)" }} />
      Brillianda
    </span>
  );
}

/**
 * The frame every signed-in screen shares: a floating sidebar on wide screens, a tab bar on
 * phones, the account menu and the command palette (Ctrl/Cmd+K). Same look as the old app.
 */
export function AppShell({
  nav,
  place,
  account,
  sampleData,
  note,
  commands = [],
  signOut,
  mark,
  children,
}: {
  nav: NavItem[];
  /** The school's name, on the sidebar card. */
  place: string;
  account: ShellAccount;
  /** Shows the "Sample data" badge while screens run on stand-in data. */
  sampleData?: boolean;
  note?: ReactNode;
  /** Extra palette entries beyond the nav, e.g. "Add a student". */
  commands?: Command[];
  /** A Server Action from the backend; until then a fake one. */
  signOut?: () => void | Promise<void>;
  /** The phone top bar's left side: the school's logo and name (plan). Our wordmark if absent. */
  mark?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const goTo: Command[] = nav.map((item) => ({ id: item.href, label: item.label, icon: item.icon, href: item.href, group: "Go to" }));

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[248px_minmax(0,1fr)] md:gap-3 md:p-3">
      <aside className="sticky top-3 hidden h-[calc(100dvh-24px)] flex-col gap-6 overflow-y-auto rounded-3xl bg-surface px-3.5 pb-3.5 pt-6 shadow-raised md:flex">
        <Wordmark className="px-2" />
        {place && (
          <div className="flex items-center gap-2.5 rounded-2xl bg-sunken p-2">
            <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-[13px] font-semibold text-primary-text">
              {initials(place) || "B"}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold leading-tight">{place}</span>
              <span className="block truncate text-xs text-text-secondary">{account.roleLabel}</span>
            </span>
          </div>
        )}
        <nav aria-label="Main" className="grid gap-1">
          {nav.map((item) => {
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex h-10 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors",
                  "focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent",
                  active ? "bg-accent-soft font-semibold text-accent" : "text-text-secondary hover:bg-hover hover:text-text-primary",
                )}
              >
                <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
                {item.label}
                {item.count ? (
                  <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1.5 text-[11px] font-semibold text-primary-text">{item.count}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        {note && (
          <div className="mt-auto rounded-2xl p-3.5 text-[13px] text-text-secondary" style={{ background: "var(--note-bg)" }}>
            {note}
          </div>
        )}
      </aside>

      <div className="min-w-0 px-4 pb-32 pt-3 md:px-3 md:pb-12">
        <header className="mb-5 flex items-center justify-end gap-2.5 md:mb-6">
          <div className="mr-auto min-w-0 md:hidden">{mark ?? <Wordmark className="text-lg" />}</div>
          <button
            type="button"
            onClick={openCommandPalette}
            aria-label="Search and go to"
            className="grid h-11 w-11 place-items-center rounded-full text-text-secondary transition-colors hover:bg-hover hover:text-text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Icon name="search" className="h-5 w-5" />
          </button>
          {sampleData && (
            <Badge tone="warning" title="Screens use stand-in data until their part of the backend is built">
              Sample data
            </Badge>
          )}
          <AccountMenu account={account} signOut={signOut} />
        </header>
        <main>{children}</main>
        <Toaster />
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-3 bottom-3 z-30 grid auto-cols-fr grid-flow-col gap-1 rounded-[22px] bg-[color-mix(in_oklab,var(--color-surface)_90%,transparent)] p-1.5 shadow-float backdrop-blur-md md:hidden"
      >
        {nav.map((item) => {
          const active = isActive(pathname, item);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cx(
                "relative grid justify-items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-medium focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent",
                active ? "bg-accent-soft text-accent" : "text-text-muted",
              )}
            >
              <Icon name={item.icon} className="h-5 w-5" />
              {item.short ?? item.label}
              {item.count ? <span aria-label={`${item.count} waiting`} className="absolute right-[calc(50%-18px)] top-1 h-2 w-2 rounded-full bg-danger" /> : null}
            </Link>
          );
        })}
      </nav>

      <CommandPalette commands={[...goTo, ...commands]} />
    </div>
  );
}

const LOOKS: [Look, string][] = [
  ["pastel", "Pastel"],
  ["neutral", "Neutral"],
];

function AccountMenu({ account, signOut }: { account: ShellAccount; signOut?: () => void | Promise<void> }) {
  const look = useLook();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === "Escape" : !ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Your account"
        onClick={() => setOpen((value) => !value)}
        className="grid h-11 w-11 place-items-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent transition-transform hover:scale-105 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        {initials(account.fullName)}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-72 animate-pop rounded-3xl bg-surface p-2 shadow-float">
          <div className="px-3 pb-3 pt-2">
            <p className="font-semibold">{account.fullName}</p>
            <p className="text-sm text-text-secondary">{account.roleLabel}</p>
          </div>
          <div className="px-3 pb-3">
            <p className="mb-2 text-xs font-medium text-text-secondary">Look</p>
            <div role="group" aria-label="Look" className="grid grid-cols-2 gap-1 rounded-full bg-sunken p-1">
              {LOOKS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={look === value}
                  onClick={() => setLook(value)}
                  className={cx(
                    "h-8 rounded-full text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent",
                    look === value ? "bg-raise text-text-primary shadow-raised" : "text-text-secondary hover:text-text-primary",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="flex h-11 w-full items-center gap-2.5 rounded-2xl px-3 text-left text-sm font-medium hover:bg-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent"
            >
              <Icon name="logout" className="h-[18px] w-[18px]" />
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
