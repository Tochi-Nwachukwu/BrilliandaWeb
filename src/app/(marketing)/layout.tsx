import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Outfit } from "next/font/google";
import { SITE_HEAD_SCRIPT } from "./site/head-script";
import "./site/tokens.css";
import "./site/base.css";
import "./site/sections.css";

// brillianda.com has its own root layout: the site's styles (warm paper, ochre, light and dark)
// are a different design from the app's, and must not mix. Going between the two is a full load.
const display = Outfit({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--font-site-display", display: "swap" });
const body = Instrument_Sans({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-site-body", display: "swap" });

export const metadata: Metadata = {
  title: "Brillianda — Classes, subjects and students for Nigerian schools",
  description:
    "Brillianda is the school register for Nigerian schools: sign up in four steps, set up classes, arms and subjects, and bring in every student from Excel or Word, on any phone.",
  openGraph: {
    title: "Brillianda — Your whole school, set up in an afternoon",
    description: "Classes, arms, subjects and students in one place, with your school's own address. Built for Nigerian schools.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf9f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0f11" },
  ],
};

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    // The head script may set data-theme and a class before React loads.
    <html lang="en" dir="ltr" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SITE_HEAD_SCRIPT }} />
        {/* Outfit has no naira sign: Inter Tight cut down to that one glyph (under a kilobyte). */}
        {/* The rule below is for the Pages Router; in a root layout this loads on every page. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300;400;500&text=%E2%82%A6&display=swap" />
        <link
          rel="preload"
          as="image"
          href="/photos/classroom-lagos-960.webp"
          imageSrcSet="/photos/classroom-lagos-480.webp 480w, /photos/classroom-lagos-960.webp 960w, /photos/classroom-lagos-1600.webp 1600w"
          imageSizes="100vw"
        />
      </head>
      <body className="is-loading">{children}</body>
    </html>
  );
}
