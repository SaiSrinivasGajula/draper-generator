"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavBar() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  const isWardrobe = pathname.startsWith("/wardrobe");

  return (
    <header className="border-b border-line bg-surface">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <Link
          href="/"
          className="font-display font-bold text-ink text-sm tracking-[0.15em] cursor-pointer"
        >
          DRAPER SOCIETY
        </Link>
        <nav className="flex gap-5 text-sm font-semibold">
          <Link
            href="/"
            className={`cursor-pointer transition-colors ${
              isWardrobe ? "text-muted hover:text-ink" : "text-ink"
            }`}
          >
            Customers
          </Link>
          <Link
            href="/wardrobe"
            className={`cursor-pointer transition-colors ${
              isWardrobe ? "text-ink" : "text-muted hover:text-ink"
            }`}
          >
            Wardrobe
          </Link>
        </nav>
      </div>
    </header>
  );
}
