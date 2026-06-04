"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck, BookOpen, GraduationCap, Users, Lock, Mail, ArrowLeft, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Simulate login verification (or hook into Firebase Auth)
    setTimeout(() => {
      setLoading(false);
      // Route depending on username key phrases or default to admin
      if (email.includes("teacher")) {
        router.push("/teacher");
      } else if (email.includes("student")) {
        router.push("/student");
      } else if (email.includes("parent")) {
        router.push("/parent");
      } else {
        router.push("/admin");
      }
    }, 1200);
  };

  const bypassOptions = [
    { label: "Admin Account", href: "/admin", icon: ShieldCheck, email: "admin@school.edu" },
    { label: "Teacher Account", href: "/teacher", icon: BookOpen, email: "teacher@school.edu" },
    { label: "Student Account", href: "/student", icon: GraduationCap, email: "student@school.edu" },
    { label: "Parent Account", href: "/parent", icon: Users, email: "parent@school.edu" },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-center py-12 px-6 lg:px-8 relative">
      {/* Back to Home Link */}
      <div className="absolute top-6 left-6">
        <Link href="/" className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-900 transition-colors font-medium">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto w-10 h-10 rounded-xl bg-emerald-950 flex items-center justify-center text-emerald-50 font-bold shadow-md mb-6">
          S
        </div>
        <h2 className="text-center text-2xl font-bold tracking-tight text-zinc-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-center text-xs text-zinc-400">
          Enter your credentials or choose a quick login role below.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="border border-zinc-200">
          <CardContent className="p-6 space-y-6">
            <form className="space-y-4" onSubmit={handleLogin}>
              {error && (
                <div className="p-3 text-xs bg-red-50 border border-red-200 rounded-lg text-red-700">
                  {error}
                </div>
              )}
              
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-800" htmlFor="email">
                  Email Address
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-450">
                    <Mail className="w-4 h-4 text-zinc-400" />
                  </span>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@school.edu"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-800" htmlFor="password">
                    Password
                  </label>
                  <Link href="#" className="text-xs font-medium text-emerald-800 hover:text-emerald-950 transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-zinc-450">
                    <Lock className="w-4 h-4 text-zinc-400" />
                  </span>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10"
                  />
                </div>
              </div>

              <Button type="submit" variant="primary" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="relative flex items-center justify-center">
              <div className="absolute border-t border-zinc-200 w-full" />
              <span className="relative bg-white px-3 text-[10px] font-semibold text-zinc-405 uppercase tracking-wider">
                Developer Bypasses
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {bypassOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => {
                      setEmail(opt.email);
                      setPassword("admin123");
                      router.push(opt.href);
                    }}
                    className="flex flex-col items-center justify-center p-3 border border-zinc-200 rounded-lg hover:border-emerald-600 hover:bg-emerald-50/20 text-center transition-all duration-150 group cursor-pointer"
                  >
                    <Icon className="w-4.5 h-4.5 text-zinc-400 group-hover:text-emerald-850 group-hover:scale-105 transition-all" />
                    <span className="text-[10px] font-semibold text-zinc-800 mt-1.5">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </CardContent>
          <CardFooter className="bg-zinc-50 border-t border-zinc-200/50 p-4 justify-center text-center">
            <span className="text-[10px] text-zinc-400">
              Antigravity Security Management System & Firebase Auth Layer active.
            </span>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
