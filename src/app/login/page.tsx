"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowLeft, Loader2, Eye, EyeOff, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const loginEmail = email.includes("@") ? email.trim() : `${email.trim()}@internal-sms.local`;
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (authError || !data.user) {
        setError(authError?.message || "Invalid credentials. Please try again.");
        setLoading(false);
        return;
      }

      // Fetch user role from profiles
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError || !profile) {
        setError("User profile not found. Please contact your administrator.");
        setLoading(false);
        return;
      }

      setLoading(false);
      if (profile.role === "teacher") {
        router.push("/teacher");
      } else if (profile.role === "student") {
        router.push("/student");
      } else if (profile.role === "parent") {
        router.push("/parent");
      } else {
        router.push("/admin");
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-center px-4 py-6 sm:px-6 lg:px-8 relative font-sans">
      {/* Back to Home Link */}
      <div className="absolute top-6 left-6">
        <Link href="/" className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-800 transition-colors font-semibold uppercase tracking-wider">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-[#064e3b] flex items-center justify-center text-[#FFFFFF] font-bold shadow-md mb-6">
          S
        </div>
        <h2 className="text-center text-2xl font-black tracking-tight text-zinc-900">
          Sign In to SMS Workspace
        </h2>
        <p className="mt-2 text-center text-xs text-zinc-400 font-medium">
          Enter your credentials to access the academic platform.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border border-zinc-200/80 shadow-lg bg-white rounded-2xl">
          <CardContent className="p-6 space-y-6">
            <form className="space-y-4" onSubmit={handleLogin}>
              {error && (
                <div className="p-3.5 text-xs bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium animate-fade-in">
                  {error}
                </div>
              )}

             <div className="space-y-1.5">
  <label
    className="text-xs font-bold text-zinc-700"
    htmlFor="email"
  >
    Username or Email
  </label>

  <div className="relative">
    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 z-10 pointer-events-none" />

    <Input
      id="email"
      name="email"
      type="text"
      autoComplete="username"
      required
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      placeholder="e.g. lords-admin-1"
      className="h-11 w-full rounded-xl border-zinc-200 pl-11 pr-4 text-sm font-medium focus:border-[#064e3b] focus:ring-1 focus:ring-[#064e3b]"
    />
  </div>
</div>

{/* Password */}
<div className="space-y-1.5">
  <div className="flex items-center justify-between">
    <label
      className="text-xs font-bold text-zinc-700"
      htmlFor="password"
    >
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
    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 z-10 pointer-events-none" />

    <Input
      id="password"
      name="password"
      type={showPassword ? "text" : "password"}
      autoComplete="current-password"
      required
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      placeholder="••••••••"
      className="h-11 w-full rounded-xl border-zinc-200 pl-11 pr-12 text-sm font-medium focus:border-[#064e3b] focus:ring-1 focus:ring-[#064e3b]"
    />

    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
      aria-label={showPassword ? "Hide password" : "Show password"}
    >
      {showPassword ? (
        <EyeOff className="h-4 w-4" />
      ) : (
        <Eye className="h-4 w-4" />
      )}
    </button>
  </div>
</div>

              <Button
                type="submit"
                variant="primary"
                className="w-full h-10 bg-[#064e3b] hover:bg-[#0f766e] active:bg-[#115e59] text-white font-bold rounded-xl shadow-md cursor-pointer transition-all duration-200 flex items-center justify-center gap-1.5"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Verifying...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="bg-zinc-50/50 border-t border-zinc-150 p-4 flex flex-col items-center gap-2.5 text-center rounded-b-2xl">
            <span className="text-[10px] text-zinc-400 font-medium">
              🔒 Unified Multi-Tenant Security & Supabase Auth active.
            </span>
            <Link href="/admin/setup" className="text-[11px] font-black text-[#064e3b] hover:text-[#0f766e] transition-colors flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-800" /> New school? Onboard School Here
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
