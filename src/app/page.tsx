"use client";

import Link from "next/link";
import { 
  ShieldCheck, 
  BookOpen, 
  Wallet, 
  Users, 
  ArrowRight, 
  Sparkles, 
  Layers,
  GraduationCap
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const personas = [
    {
      role: "Administrator",
      description: "Manage operations, bulk CSV ingestion, and stackable student fee adjustments with live modifiers calculation.",
      href: "/admin",
      color: "border-emerald-200 hover:border-emerald-500 hover:shadow-emerald-50/50",
      icon: ShieldCheck,
      badge: "Desktop Optimized",
      features: ["CSV Bulk Student/Teacher Intake", "Stackable Discount/Fee Ledgers", "Real-Time Ledger Calculator"],
    },
    {
      role: "Teacher",
      description: "Execute high-speed workflows like taking attendance in seconds and grading classes via spreadsheet inputs.",
      href: "/teacher",
      color: "border-zinc-200 hover:border-emerald-500 hover:shadow-emerald-50/50",
      icon: BookOpen,
      badge: "Hybrid / Mobile First",
      features: ["3-Tap Roll Call (Attendance)", "Spreadsheet Inline Grading Grid", "Mock & Final Assessment Creation"],
    },
    {
      role: "Student",
      description: "Check your outstanding fees ledger, track your daily class schedule, and view grades.",
      href: "/student",
      color: "border-zinc-200 hover:border-emerald-500 hover:shadow-emerald-50/50",
      icon: GraduationCap,
      badge: "Mobile-First",
      features: ["Outstanding Dues Transparency", "Academic Progress Matrix", "Daily Class Timetable"],
    },
    {
      role: "Parent",
      description: "Track your child's progress, get financial updates instantly, and download single-click term report scorecards.",
      href: "/parent",
      color: "border-zinc-200 hover:border-emerald-500 hover:shadow-emerald-50/50",
      icon: Users,
      badge: "Mobile-First",
      features: ["Consolidated Financial Overview", "Consolidated Grades Feed", "1-Click PDF Scorecard Compiler"],
    },
  ];

  return (
    <div className="flex-1 bg-zinc-50 flex flex-col justify-between">
      {/* Header */}
      <header className="border-b border-zinc-200/50 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 flex items-center justify-center text-emerald-50 font-bold shadow-xs">
              S
            </div>
            <span className="font-semibold text-zinc-900 tracking-tight">Antigravity School Management</span>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="primary" className="hidden sm:inline-flex gap-1.5 py-1 px-2.5 font-normal text-xs">
              <Sparkles className="w-3.5 h-3.5" /> Developer Preview Active
            </Badge>
            <Link href="/login">
              <Button variant="outline" size="sm">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12 md:py-20 flex-1 flex flex-col items-center justify-center">
        {/* Hero Section */}
        <div className="text-center max-w-3xl space-y-5 mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-medium">
            <Layers className="w-3.5 h-3.5" /> Rebuilt with UX-First Design Paradigms
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-900 leading-tight">
            Zero friction administration.<br />
            <span className="text-emerald-950">Luxury-minimalist workspace.</span>
          </h1>
          <p className="text-base md:text-lg text-zinc-500 font-light max-w-xl mx-auto leading-relaxed">
            A high-performance School Management System eliminating cognitive load. Designed mobile-first for teachers, parents, and students.
          </p>
        </div>

        {/* Persona Switcher / Development Grid */}
        <div className="w-full space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 tracking-tight">Development Persona Switcher</h2>
              <p className="text-xs text-zinc-400 mt-0.5">Click any workspace card to bypass login and test features immediately.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {personas.map((persona) => {
              const Icon = persona.icon;
              return (
                <Link key={persona.role} href={persona.href} className="group block transition-all duration-200">
                  <Card className={`h-full border transition-all duration-200 ${persona.color}`}>
                    <CardHeader className="flex flex-row items-start justify-between p-5">
                      <div className="space-y-1">
                        <Badge variant={persona.role === "Administrator" ? "primary" : "secondary"}>
                          {persona.badge}
                        </Badge>
                        <CardTitle className="text-lg group-hover:text-emerald-950 transition-colors flex items-center gap-2 mt-2">
                          <Icon className="w-5 h-5 text-emerald-850 group-hover:scale-105 transition-transform" />
                          {persona.role} Workspace
                        </CardTitle>
                      </div>
                      <div className="w-8 h-8 rounded-full border border-zinc-200 group-hover:border-emerald-500 group-hover:bg-emerald-50 flex items-center justify-center text-zinc-400 group-hover:text-emerald-950 transition-all duration-200">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 pt-0 space-y-4">
                      <CardDescription className="text-sm text-zinc-500 font-normal leading-relaxed">
                        {persona.description}
                      </CardDescription>
                      
                      <div className="pt-2">
                        <div className="text-xs font-semibold text-zinc-800 tracking-wider uppercase mb-2">Key Test Features:</div>
                        <ul className="grid grid-cols-1 gap-1.5 text-xs text-zinc-500">
                          {persona.features.map((feat) => (
                            <li key={feat} className="flex items-center gap-2">
                              <span className="w-1 h-1 rounded-full bg-emerald-800" />
                              {feat}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200/50 bg-white py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <p>© 2026 Antigravity SMS. Built for modern administrative efficiency.</p>
          <div className="flex gap-4">
            <Link href="/docs/main_product_idea.md" className="hover:text-zinc-650 transition-colors">Vision Specs</Link>
            <Link href="/docs/ai_agent_rules.md" className="hover:text-zinc-650 transition-colors">Agent Guardrails</Link>
            <Link href="/docs/tech_stack_architecture.md" className="hover:text-zinc-650 transition-colors">Tech Architecture</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
