import type { Metadata } from "next";
import Link from "next/link";
import { Outfit } from "next/font/google";
import { LOOK_SCRIPT } from "@/lib/look-script";
import "./globals.css";

// For addresses that match no page at all. There are two root layouts (the site and the app), so
// this page brings its own styles and font.
const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-outfit", display: "swap" });

export const metadata: Metadata = { title: "Page not found · Brillianda" };

export default function GlobalNotFound() {
  return (
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LOOK_SCRIPT }} />
      </head>
      <body>
        <main className="grid min-h-dvh place-items-center p-4">
          <div className="grid w-full max-w-md animate-pop justify-items-center gap-3 rounded-[26px] bg-surface p-8 text-center shadow-raised">
            <span aria-hidden className="mb-2 h-12 w-12 rounded-[15px]" style={{ background: "var(--brand-mark)" }} />
            <h1 className="text-[26px] font-medium tracking-[-0.025em]">We can’t find that page</h1>
            <p className="text-text-secondary">The address may be mistyped, or the page has moved.</p>
            <Link
              href="/"
              className="mt-3 inline-flex min-h-[42px] items-center rounded-full bg-primary px-5 font-medium text-primary-text hover:bg-primary-hover focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
            >
              Go to brillianda.com
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
