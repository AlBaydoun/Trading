import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "axiom_session";

/**
 * Optimistic gate only.
 *
 * Middleware runs on the Edge runtime and cannot reach the database, so it can
 * check that a session cookie *exists* but not that it is valid. That is enough
 * to bounce signed-out visitors without a wasted render. The authoritative
 * check lives in `requireUser` / `requireRole`, which every private page and
 * server action calls — a forged cookie gets past this and straight into a real
 * database lookup that rejects it.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${pathname}${search}`);

    const response = NextResponse.redirect(login);
    // A protected page must never be cached by a shared proxy.
    response.headers.set("cache-control", "no-store");
    return response;
  }

  const response = NextResponse.next();
  response.headers.set("cache-control", "no-store, must-revalidate");
  response.headers.set("x-robots-tag", "noindex, nofollow");
  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
};
