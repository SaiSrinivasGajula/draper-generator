import type { Metadata } from "next";
import { NavBar } from "@/components/NavBar";
import { syne, manrope } from "../fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: "Draper Society — Lookbook Studio",
  description: "Internal tool for building AI-generated customer lookbooks",
};

export default function AppLayout({
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
