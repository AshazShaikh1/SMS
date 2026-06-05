"use client";

import Link from "next/link";
import { 
  ArrowRight, 
  Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex-1 bg-zinc-50 flex flex-col justify-between min-h-screen">
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
            <Link href="/login">
              <Button variant="outline" size="sm">
                Login
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-20 flex-1 flex flex-col items-center justify-center text-center">
        {/* Hero Section */}
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-medium">
            <Layers className="w-3.5 h-3.5" /> Rebuilt with UX-First Design Paradigms
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-900 leading-tight">
            Zero friction administration.<br />
            <span className="text-[#064e3b]">Luxury-minimalist workspace.</span>
          </h1>
          <p className="text-base md:text-lg text-zinc-500 font-light max-w-xl mx-auto leading-relaxed">
            A high-performance, multi-tenant School Management System designed to eliminate cognitive load. Built securely for administrators, teachers, students, and parents.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row justify-center gap-3">
            <Link href="/login">
              <Button size="lg" className="bg-[#064e3b] hover:bg-[#0f766e] text-white font-semibold px-8 py-3 rounded-xl shadow-md flex items-center gap-2">
                Access Workspace <ArrowRight className="w-4.5 h-4.5" />
              </Button>
            </Link>
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
