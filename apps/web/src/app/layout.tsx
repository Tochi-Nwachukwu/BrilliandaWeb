import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brillianda",
  description: "School registry for Nigerian schools: classes, arms, subjects and students, on any phone.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
