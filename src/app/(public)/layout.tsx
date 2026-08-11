import type { Metadata } from "next";
import { syne, manrope } from "../fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: "Your Lookbook — Draper Society",
  description: "A curated lookbook from Draper Society",
};

// Minimal public shell — deliberately no <NavBar/> and no internal-tool
// chrome, since anyone with a share link (no login) lands here.
export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${syne.variable} ${manrope.variable}`}
    >
      <body className="min-h-full bg-ink text-cream font-body">{children}</body>
    </html>
  );
}
