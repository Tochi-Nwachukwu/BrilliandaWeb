import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { USING_SAMPLE_DATA } from "../api/sampleData";
import { useAuthStore } from "../auth/authStore";
import { useLogout } from "../auth/session";
import { Badge } from "../components/Badge";
import { Icon, type IconName } from "../components/Icon";
import { Toaster } from "../components/Toast";
import { useLook, type Look } from "../theme/useLook";
import { cx } from "../utils/cx";

export type NavItem = {
  to: string;
  label: string;
  icon: IconName;
  /** Shorter label for the phone tab bar. */
  short?: string;
  /** Match the path exactly (for a portal's home). */
  end?: boolean;
  /** A small red count, e.g. requests waiting. */
  count?: number;
};

const ROLE_LABEL = {
  SUPER_ADMIN: "Brillanda team",
  SCHOOL_ADMIN: "School admin",
  TEACHER: "Teacher",
  PARENT: "Parent",
  STUDENT: "Student",
} as const;

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((word) => /^[A-Za-z]/.test(word))
    .map((word) => word[0]!.toUpperCase())
    .slice(0, 2)
    .join("");
}

function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2.5 text-xl font-semibold tracking-tight", className)}>
      <span aria-hidden className="h-7 w-7 rounded-[9px] shadow-[inset_0_0_0_1px_rgba(35,30,54,0.06)]" style={{ background: "var(--brand-mark)" }} />
      Brillanda
    </span>
  );
}

/**
 * The frame every portal shares (the Pastel prototype, design/prototype): a floating sidebar on
 * wide screens, a tab bar on phones, and the account menu. Pages render into the Outlet.
 */
export function AppShell({ nav, note }: { nav: NavItem[]; note?: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const place = user?.role === "SUPER_ADMIN" ? "Brillanda team" : user?.school?.name ?? "";

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
              <span className="block truncate text-xs text-text-secondary">
                {/* The Brillanda team's card already names the team, so it shows who is signed in. */}
                {user ? (user.role === "SUPER_ADMIN" ? user.fullName : ROLE_LABEL[user.role]) : ""}
              </span>
            </span>
          </div>
        )}
        <nav aria-label="Main" className="grid gap-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cx(
                  "flex h-10 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  isActive ? "bg-accent-soft font-semibold text-accent" : "text-text-secondary hover:bg-hover hover:text-text-primary",
                )
              }
            >
              <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
              {item.label}
              {item.count ? (
                <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1.5 text-[11px] font-semibold text-primary-text">
                  {item.count}
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>
        {note && <div className="mt-auto rounded-2xl p-3.5 text-[13px] text-text-secondary" style={{ background: "var(--note-bg)" }}>{note}</div>}
      </aside>

      <div className="min-w-0 px-4 pb-32 pt-3 md:px-3 md:pb-12">
        <header className="mb-5 flex items-center justify-end gap-2.5 md:mb-6">
          <Wordmark className="mr-auto text-lg md:hidden" />
          {USING_SAMPLE_DATA && (
            <Badge tone="warning" title="Screens use stand-in data until their part of the backend is built">
              Sample data
            </Badge>
          )}
          <AccountMenu />
        </header>
        <main>
          <Outlet />
        </main>
        <Toaster />
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-3 bottom-3 z-30 grid auto-cols-fr grid-flow-col gap-1 rounded-[22px] bg-[color-mix(in_oklab,var(--color-surface)_90%,transparent)] p-1.5 shadow-float backdrop-blur-md md:hidden"
      >
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cx(
                "relative grid justify-items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                isActive ? "bg-accent-soft text-accent" : "text-text-muted",
              )
            }
          >
            <Icon name={item.icon} className="h-5 w-5" />
            {item.short ?? item.label}
            {item.count ? <span aria-label={`${item.count} waiting`} className="absolute right-[calc(50%-18px)] top-1 h-2 w-2 rounded-full bg-danger" /> : null}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

const LOOKS: [Look, string][] = [
  ["pastel", "Pastel"],
  ["neutral", "Neutral"],
];

function AccountMenu() {
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  const { look, setLook } = useLook();
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

  if (!user) return null;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Your account"
        onClick={() => setOpen((value) => !value)}
        className="grid h-11 w-11 place-items-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
      >
        {initials(user.fullName)}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-72 animate-pop rounded-3xl bg-surface p-2 shadow-float">
          <div className="px-3 pb-3 pt-2">
            <p className="font-semibold">{user.fullName}</p>
            <p className="text-sm text-text-secondary">{ROLE_LABEL[user.role]}</p>
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
                    "h-8 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    look === value ? "bg-raise text-text-primary shadow-raised" : "text-text-secondary hover:text-text-primary",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex h-11 w-full items-center gap-2.5 rounded-2xl px-3 text-left text-sm font-medium hover:bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Icon name="logout" className="h-[18px] w-[18px]" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
