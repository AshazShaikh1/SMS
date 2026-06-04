"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Users, GraduationCap, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 pb-20 md:pb-0">
      {/* Mobile Top Header */}
      <header className="border-b border-zinc-200/50 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-xs h-14 flex items-center justify-between px-5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-950 flex items-center justify-center text-emerald-50 font-bold text-sm shadow-xs">
            P
          </div>
          <span className="font-semibold text-zinc-900 tracking-tight text-sm">Parent Hub</span>
        </div>
        <Badge variant="secondary" className="py-0.5 px-2.5 font-normal text-[10px]">
          Parent ID: PAR_582910
        </Badge>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 py-6 px-4 max-w-md mx-auto w-full">
        {children}
      </main>

      {/* Mobile Sticky Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-zinc-200 flex items-center justify-around px-2 z-50 shadow-lg md:max-w-md md:mx-auto md:border-x md:rounded-t-xl">
        <Link
          href="/parent"
          className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all ${
            pathname === "/parent" ? "text-emerald-950" : "text-zinc-400 hover:text-zinc-650"
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-wider mt-1">Dashboard</span>
        </Link>
        
        <button
          onClick={() => router.push("/")}
          className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center text-zinc-400 hover:text-zinc-600 cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-wider mt-1">Exit Hub</span>
        </button>
      </nav>
    </div>
  );
}
