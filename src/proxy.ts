import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Decode JWT payload without signature verification
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

// Extract the Supabase access_token from the sb-auth-token cookie
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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow public routes
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password") ||
    pathname.startsWith("/admin/setup") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_not-found") ||
    pathname.startsWith("/_next/") ||
    pathname === "/"
  ) {
    return NextResponse.next();
  }

  // Extract and validate token
  const token = getAccessToken(request);
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Check expiration
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const userId = payload.sub;
  if (!userId) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Query database profile in Edge middleware to find the actual role & school
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let userRole = "";
  let schoolId = "";

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=role,school_id`, {
      headers: {
        apikey: supabaseAnonKey!,
        Authorization: `Bearer ${token}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        userRole = data[0].role;
        schoolId = data[0].school_id;
      }
    }
  } catch (e) {
    console.error("Middleware profile lookup failed:", e);
  }

  if (!userRole) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Check for developer impersonation Ghost Mode cookie
  const ghostCookie = request.cookies.get("ghost_session");
  let isGhosting = false;
  let targetRole = "";

  if (userRole === "developer" && ghostCookie?.value) {
    try {
      const ghostSession = JSON.parse(decodeURIComponent(ghostCookie.value));
      if (ghostSession && ghostSession.role) {
        isGhosting = true;
        targetRole = ghostSession.role;
      }
    } catch (e) {
      console.error("Error parsing ghost_session in middleware:", e);
    }
  }

  const activeRole = isGhosting ? targetRole : userRole;

  // Protect developer dashboard — only developers can view it, regardless of impersonation
  if (pathname.startsWith("/developer") && userRole !== "developer") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Protect role folders based on active role
  if (pathname.startsWith("/admin") && activeRole !== "admin") {
    return redirectByUserRole(userRole, request);
  }
  if (pathname.startsWith("/teacher") && activeRole !== "teacher") {
    return redirectByUserRole(userRole, request);
  }
  if (pathname.startsWith("/student") && activeRole !== "student") {
    return redirectByUserRole(userRole, request);
  }
  if (pathname.startsWith("/parent") && activeRole !== "parent") {
    return redirectByUserRole(userRole, request);
  }

  return NextResponse.next();
}

function redirectByUserRole(role: string, request: NextRequest) {
  const dests: Record<string, string> = {
    developer: "/developer/dashboard",
    admin: "/admin",
    teacher: "/teacher",
    student: "/student",
    parent: "/parent"
  };
  const url = dests[role] || "/login";
  return NextResponse.redirect(new URL(url, request.url));
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
