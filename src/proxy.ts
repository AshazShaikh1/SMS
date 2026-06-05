import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Decode a JWT payload without verifying the signature.
 * Safe for routing decisions only — Supabase enforces signature
 * verification on every DB/API call independently.
 */
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

/**
 * Extract the Supabase access_token from the sb-auth-token cookie.
 */
function getAccessToken(request: NextRequest): string | null {
  const cookie = request.cookies.get("sb-auth-token");
  if (!cookie?.value) return null;

  try {
    const session = JSON.parse(decodeURIComponent(cookie.value));
    return session?.access_token ?? null;
  } catch {
    try {
      const session = JSON.parse(cookie.value);
      return session?.access_token ?? null;
    } catch {
      return null;
    }
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public routes
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/admin/setup") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  // Extract and decode the session token from the cookie
  const token = getAccessToken(request);
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Check token expiry
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Token is valid — let the request through.
  // Role-based access checks happen inside each page.
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/developer/:path*",
    "/admin/:path*",
    "/teacher/:path*",
    "/student/:path*",
    "/parent/:path*",
  ],
};
