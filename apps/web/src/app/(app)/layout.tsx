import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { Hydrated } from "@/components/Hydrated";
import { LOOK_SCRIPT } from "@/lib/look-script";
import "../globals.css";

// Outfit, the app's one typeface. Served from our own domain, so no flash of the system face.
const outfit = Outfit({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-outfit", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Brillianda", template: "%s · Brillianda" },
  description: "School registry for Nigerian schools: classes, arms, subjects and students, on any phone.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The look script below may set data-theme before React loads, hence suppressHydrationWarning.
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LOOK_SCRIPT }} />
      </head>
      <body>
        {children}
        <Hydrated />
      </body>
    </html>
  );
}
