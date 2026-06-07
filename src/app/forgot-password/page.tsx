"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Mail, CheckCircle } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (resetError) {
        setError(resetError.message);
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-center px-4 py-6 sm:px-6 lg:px-8 relative font-sans">
      {/* Back to Login */}
      <div className="absolute top-6 left-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-800 transition-colors font-semibold uppercase tracking-wider"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
        </Link>
      </div>

      {/* Logo + Title */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-8">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-[#064e3b] flex items-center justify-center text-white font-bold shadow-md mb-6">
          S
        </div>
        <h1 className="text-2xl font-black tracking-tight text-zinc-900">
          Recover Password
        </h1>
        <p className="mt-2 text-xs text-zinc-400 font-medium">
          Enter your email to receive a password recovery link.
        </p>
      </div>

      {/* Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border border-zinc-200/80 shadow-lg bg-white rounded-2xl">
          <CardContent className="p-6">
            {success ? (
              <div className="space-y-4 py-4 text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mb-2">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-zinc-800">Check your inbox</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                  If this email is registered in our database, we have sent a secure recovery link to reset your password.
                </p>
                <div className="pt-2">
                  <Link href="/login">
                    <Button variant="outline" className="text-xs rounded-xl font-semibold border-zinc-250 hover:bg-zinc-50">
                      Return to Login
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleResetRequest} className="space-y-5">
                {error && (
                  <div className="p-3.5 text-xs bg-red-50 border border-red-200 rounded-xl text-red-700 font-medium">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-bold text-zinc-700">
                    Email Address
                  </label>
                  <div className="relative">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. yourname@school.edu"
                      className="h-11 w-full rounded-xl border-zinc-200 px-4 pl-10 text-sm font-medium focus:border-[#064e3b] focus:ring-1 focus:ring-[#064e3b]"
                    />
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full h-11 bg-[#064e3b] hover:bg-[#0f766e] active:bg-[#115e59] text-white font-bold rounded-xl shadow-md cursor-pointer transition-all duration-200 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending Link...
                    </>
                  ) : (
                    "Send Recovery Link"
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
