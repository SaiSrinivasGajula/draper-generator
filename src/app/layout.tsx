import type { Metadata } from "next";
import { Syne, Manrope } from "next/font/google";
import { NavBar } from "@/components/NavBar";
import "./globals.css";

const syne = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const manrope = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Draper Society — Lookbook Studio",
  description: "Internal tool for building AI-generated customer lookbooks",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${syne.variable} ${manrope.variable}`}
    >
      <body className="min-h-full flex flex-col bg-cream text-ink font-body">
        <NavBar />
        {children}
      </body>
    </html>
  );
}
