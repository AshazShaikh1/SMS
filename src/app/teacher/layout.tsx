"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, ClipboardCheck, GraduationCap, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { signOut } from "@/lib/supabase/client";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const handleLogout = async () => {
    await signOut();
    window.location.href = "/login";
  };

  const navItems = [
    { name: "Home", href: "/teacher", icon: Calendar },
    { name: "Attendance", href: "/teacher/attendance", icon: ClipboardCheck },
    { name: "Grades", href: "/teacher/grading", icon: GraduationCap },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#FAF9F6] pb-20 md:pb-0">
      {/* Desktop Top Header (visible on md+) */}
      <header className="hidden md:block border-b border-[#E4E4E7] bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#022c22] flex items-center justify-center text-white font-bold shadow-xs">
              T
            </div>
            <div>
              <span className="font-semibold text-zinc-900 tracking-tight block leading-none">Teacher Dashboard</span>
              <span className="text-[9px] text-[#064e3b] font-medium">Welcome back</span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                    isActive
                      ? "bg-[#064e3b] text-white shadow-xs"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer rounded-lg hover:bg-zinc-100"
          >
            <LogOut className="w-3.5 h-3.5 text-zinc-400" /> Log Out
          </button>
        </div>
      </header>

      {/* Mobile Top Header (visible on < md) */}
      <header className="border-b border-[#E4E4E7] bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-xs h-14 flex items-center justify-between px-5 md:hidden">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#022c22] flex items-center justify-center text-white font-bold text-sm shadow-xs">
            T
          </div>
          <span className="font-semibold text-zinc-900 tracking-tight text-sm">Teacher Dashboard</span>
        </div>
        <Badge variant="primary" className="py-0.5 px-2 font-normal text-[10px]">
          Teacher
        </Badge>
      </header>

      {/* Mobile Sticky Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-[#E4E4E7] flex items-center justify-around px-2 z-40 shadow-lg md:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all ${
                isActive ? "text-[#064e3b]" : "text-[#a1a1aa] hover:text-zinc-600"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold tracking-wider mt-1">{item.name}</span>
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center text-[#a1a1aa] hover:text-zinc-600 cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-wider mt-1">Log Out</span>
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 py-6 px-4 md:py-8 md:px-6 max-w-7xl w-full mx-auto">
        {children}
      </main>
    </div>
  );
}
