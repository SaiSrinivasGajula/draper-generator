import { Syne, Manrope } from "next/font/google";

// Shared across both root layouts ((app) and (public) route groups) so the
// internal tool and the public client-facing lookbook stay on-brand and in
// sync — see src/app/(app)/layout.tsx and src/app/(public)/layout.tsx.
export const syne = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const manrope = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
