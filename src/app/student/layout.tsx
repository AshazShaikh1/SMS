"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GraduationCap, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { signOut } from "@/lib/supabase/client";

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/login";
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF9F6] pb-20">
      {/* Sticky Top Header */}
      <header className="border-b border-[#E4E4E7] bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-xs h-14 flex items-center justify-between px-5">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="EduNexus" className="h-7 w-auto object-contain" />
          <span className="font-semibold text-zinc-900 tracking-tight text-sm">My School</span>
        </div>
        <Badge variant="primary" className="py-0.5 px-2 font-normal text-[10px] bg-[#1572FE] hover:bg-[#1572FE] text-white">
          Student
        </Badge>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-6 px-4 max-w-md mx-auto w-full">
        {children}
      </main>

      {/* Sticky Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[#E4E4E7] flex items-center justify-around px-2 z-50 shadow-lg">
        <Link
          href="/student"
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all ${
            pathname === "/student" ? "text-[#1572FE]" : "text-[#a1a1aa] hover:text-zinc-600"
          }`}
        >
          <GraduationCap className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-wider mt-1">My Dashboard</span>
        </Link>

        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center text-[#a1a1aa] hover:text-zinc-600 cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-wider mt-1">Log Out</span>
        </button>
      </nav>
    </div>
  );
}
