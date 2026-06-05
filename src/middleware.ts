import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bypass setup wizard to allow new school registration
  if (pathname.startsWith("/admin/setup")) {
    return NextResponse.next();
  }

  // Verify Supabase session token from cookie
  const authCookie = request.cookies.get("sb-auth-token");
  let token = "";
  if (authCookie?.value) {
    try {
      const decodedVal = decodeURIComponent(authCookie.value);
      const session = JSON.parse(decodedVal);
      token = session.access_token;
    } catch (e) {
      try {
        const session = JSON.parse(authCookie.value);
        token = session.access_token;
      } catch (innerE) {
        token = authCookie.value;
      }
    }
  }

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Verify session securely with Supabase Auth API
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-url.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-key";
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Fetch role from profiles
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = profile.role;
  const userId = user.id;

  // Developer whitelist
  const whitelistedDevs = new Set([
    "00000000-0000-0000-0000-000000000000",
    "11111111-1111-1111-1111-111111111111",
    process.env.DEVELOPER_UUID,
    process.env.NEXT_PUBLIC_DEVELOPER_UUID
  ].filter(Boolean));

  // If role is developer but ID is not in whitelist, reject access
  if (role === "developer" && !whitelistedDevs.has(userId)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Enforce route isolation
  if (role === "developer") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/admin") && role !== "admin") {
    return NextResponse.redirect(new URL(`/${role}`, request.url));
  }
  if (pathname.startsWith("/teacher") && role !== "teacher") {
    return NextResponse.redirect(new URL(`/${role}`, request.url));
  }
  if (pathname.startsWith("/student") && role !== "student") {
    return NextResponse.redirect(new URL(`/${role}`, request.url));
  }
  if (pathname.startsWith("/parent") && role !== "parent") {
    return NextResponse.redirect(new URL(`/${role}`, request.url));
  }
  if (pathname.startsWith("/developer")) {
    return NextResponse.redirect(new URL(`/${role}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/developer/:path*",
    "/admin/:path*",
    "/teacher/:path*",
    "/student/:path*",
    "/parent/:path*"
  ]
};
