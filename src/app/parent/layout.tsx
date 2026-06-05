"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { signOut } from "@/lib/supabase/client";

export default function ParentLayout({
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
      {/* Top Header */}
      <header className="border-b border-[#E4E4E7] bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-xs h-14 flex items-center justify-between px-5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#022c22] flex items-center justify-center text-white font-bold text-sm shadow-xs">
            P
          </div>
          <span className="font-semibold text-zinc-900 tracking-tight text-sm">My Children</span>
        </div>
        <Badge variant="secondary" className="py-0.5 px-2.5 font-normal text-[10px]">
          Parent
        </Badge>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-6 px-4 max-w-md mx-auto w-full">
        {children}
      </main>

      {/* Sticky Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[#E4E4E7] flex items-center justify-around px-2 z-50 shadow-lg">
        <Link
          href="/parent"
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all ${
            pathname === "/parent" ? "text-[#064e3b]" : "text-[#a1a1aa] hover:text-zinc-600"
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-wider mt-1">Dashboard</span>
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
