import type { Metadata } from "next";
import { RetryWhenOnline } from "./RetryWhenOnline";

export const metadata: Metadata = { title: "You’re offline", robots: { index: false } };

// The page the service worker shows when a page can't load. Saved on the phone, so it can't know
// the school or show any of its records: just what happened and what to do.
export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-bg px-4 py-10">
      <div className="w-full max-w-sm animate-lift rounded-3xl bg-surface p-6 text-center shadow-raised">
        <span aria-hidden className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 8.8a15 15 0 0 1 4.2-2.6M9.5 5.2A15 15 0 0 1 22 8.8M5 12.6a10 10 0 0 1 3.4-2.1M14 10.2a10 10 0 0 1 5 2.4M8.5 16.4a5 5 0 0 1 7 0M12 20h.01M3 3l18 18" />
          </svg>
        </span>
        <h1 className="mt-4 text-[22px] font-semibold tracking-[-0.02em]">You’re offline</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-text-secondary">
          This page needs a connection, because your school’s records stay on Brillianda, not on this phone. Check your data or Wi-Fi.
        </p>
        <RetryWhenOnline />
      </div>
    </main>
  );
}
