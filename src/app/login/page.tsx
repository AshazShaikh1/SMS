"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Eye, EyeOff, Sparkles } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";

const ROLE_DESTINATIONS: Record<string, string> = {
  developer: "/developer/dashboard",
  admin: "/admin",
  teacher: "/teacher",
  student: "/student",
  parent: "/parent",
};

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      // Append hidden domain if user typed just a username (not a full email)
      const email = username.trim().includes("@")
        ? username.trim()
        : `${username.trim()}@internal-sms.local`;

      // Step 1: Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user || !authData.session) {
        setError(authError?.message || "Invalid credentials. Please try again.");
        setLoading(false);
        return;
      }

      // Step 2: Write the session cookie NOW — synchronously, before any navigation.
      // We use window.location.href below (full browser reload) not router.push,
      // so the cookie must be written here for the middleware to pick it up.
      const maxAge = 100 * 365 * 24 * 60 * 60; // 100 years
      document.cookie = [
        `sb-auth-token=${encodeURIComponent(JSON.stringify(authData.session))}`,
        `path=/`,
        `max-age=${maxAge}`,
        `SameSite=Lax`,
      ].join("; ");

      // Step 3: Fetch role from profiles table
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !profile) {
        setError("Profile not found. Contact your administrator.");
        setLoading(false);
        return;
      }

      // Step 4: Full browser navigation (not router.push).
      // window.location.href sends a real HTTP request with all cookies,
      // so the middleware cookie check always succeeds.
      const destination = ROLE_DESTINATIONS[profile.role] ?? "/admin";
      window.location.href = destination;

    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-center px-4 py-6 sm:px-6 lg:px-8 relative font-sans">

      {/* Back to Home */}
      <div className="absolute top-6 left-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-800 transition-colors font-semibold uppercase tracking-wider"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>
      </div>

      {/* Logo + Title */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-[#064e3b] flex items-center justify-center text-white font-bold shadow-md mb-6">
          S
        </div>
        <h1 className="text-2xl font-black tracking-tight text-zinc-900">
          Sign In to SMS Workspace
        </h1>
        <p className="mt-2 text-xs text-zinc-400 font-medium">
          Enter your credentials to access the academic platform.
        </p>
      </div>

      {/* Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border border-zinc-200/80 shadow-lg bg-white rounded-2xl">
          <CardContent className="p-6">
            <form onSubmit={handleLogin} className="space-y-5">

              {/* Error banner */}
              {error && (
                <div className="p-3.5 text-xs bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium">
                  {error}
                </div>
              )}

              {/* Username field */}
              <div className="space-y-1.5">
                <label htmlFor="username" className="text-xs font-bold text-zinc-700">
                  Username or Email
                </label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. lords-admin-1"
                  className="h-11 w-full rounded-xl border-zinc-200 px-4 text-sm font-medium focus:border-[#064e3b] focus:ring-1 focus:ring-[#064e3b]"
                />
              </div>

              {/* Password field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-xs font-bold text-zinc-700">
                    Password
                  </label>
                  <Link
                    href="#"
                    className="text-xs font-bold text-[#064e3b] hover:text-[#0f766e] transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-11 w-full rounded-xl border-zinc-200 px-4 pr-12 text-sm font-medium focus:border-[#064e3b] focus:ring-1 focus:ring-[#064e3b]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-[#064e3b] hover:bg-[#0f766e] active:bg-[#115e59] text-white font-bold rounded-xl shadow-md cursor-pointer transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="bg-zinc-50/50 border-t border-zinc-100 p-4 flex flex-col items-center gap-2.5 text-center rounded-b-2xl">
            <span className="text-[10px] text-zinc-400 font-medium">
              🔒 Unified Multi-Tenant Security · Supabase Auth active
            </span>
            <Link
              href="/admin/setup"
              className="text-[11px] font-black text-[#064e3b] hover:text-[#0f766e] transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              New school? Onboard School Here
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
