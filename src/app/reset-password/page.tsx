"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  // Check if session exists or if we got redirected.
  // Supabase Auth handles reset redirection by placing access token in URL hash / fragment.
  useEffect(() => {
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      // If there's no session and no hash parameters, user might have navigated here manually.
      // However, we still let them try to update if Supabase has established the context.
    }
    checkSession();
  }, []);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
        // Clear auth token cookie so they have to sign in with new credentials
        document.cookie = "sb-auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Lax";

        setTimeout(() => {
          router.push("/login");
        }, 3000);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-center px-4 py-6 sm:px-6 lg:px-8 relative font-sans">
      {/* Logo + Title */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <img src="/logo.svg" alt="EduNexus" className="mx-auto h-12 w-auto object-contain mb-6" />
        <h1 className="text-2xl font-black tracking-tight text-zinc-900">
          Reset Your Password
        </h1>
        <p className="mt-2 text-xs text-zinc-400 font-medium">
          Create a new secure password for your account.
        </p>
      </div>

      {/* Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border border-zinc-200/80 shadow-lg bg-white rounded-2xl">
          <CardContent className="p-6">
            {success ? (
              <div className="space-y-4 py-4 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center mb-2">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-zinc-800">Password Updated!</h3>
                <p className="text-xs text-zinc-505 max-w-sm mx-auto leading-relaxed">
                  Your password has been successfully updated. Redirecting you to the Sign In page...
                </p>
                <div className="flex justify-center items-center gap-2 text-xs text-zinc-400 pt-2 font-medium">
                  <Loader2 className="w-4 h-4 animate-spin text-[#1572FE]" />
                  Please wait...
                </div>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-5">
                {error && (
                  <div className="p-3.5 text-xs bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium">
                    {error}
                  </div>
                )}

                {/* Password field */}
                <div className="space-y-1.5">
                  <label htmlFor="password" className="text-xs font-bold text-zinc-700">
                    New Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="h-11 w-full rounded-xl border-zinc-200 px-4 pl-10 pr-12 text-sm font-medium focus:border-[#1572FE] focus:ring-1 focus:ring-[#1572FE]"
                    />
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password field */}
                <div className="space-y-1.5">
                  <label htmlFor="confirmPassword" className="text-xs font-bold text-zinc-700">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="h-11 w-full rounded-xl border-zinc-200 px-4 pl-10 pr-12 text-sm font-medium focus:border-[#1572FE] focus:ring-1 focus:ring-[#1572FE]"
                    />
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 bg-[#1572FE] hover:bg-[#0f62d4] active:bg-[#004dc5] text-white font-bold rounded-xl shadow-md cursor-pointer transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving Password...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="bg-zinc-50/50 border-t border-zinc-100 p-4 flex justify-center rounded-b-2xl">
            <span className="text-[10px] text-zinc-400 font-medium">
              🔒 Unified Multi-Tenant Security · Supabase Auth active
            </span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
