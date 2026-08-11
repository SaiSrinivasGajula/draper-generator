import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE = "draper_auth";

export function proxy(req: NextRequest) {
  const appPassword = process.env.APP_PASSWORD;

  // No password configured (e.g. local dev) — auth gate is disabled.
  if (!appPassword) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (
    pathname === "/login" ||
    pathname === "/api/auth/login" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/files") ||
    // Public, no-login client-facing lookbook (share link + its data/heart-toggle API).
    pathname.startsWith("/lb/") ||
    pathname.startsWith("/api/public/")
  ) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get(AUTH_COOKIE)?.value;
  if (cookie === appPassword) return NextResponse.next();

  const loginUrl = new URL("/login", req.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
