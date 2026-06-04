"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  UserPlus, 
  Wallet, 
  LogOut, 
  Home
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const menuItems = [
    { name: "Overview", href: "/admin", icon: Home },
    { name: "Add Students", href: "/admin/intake", icon: UserPlus },
    { name: "Fees & Scholarships", href: "/admin/finance", icon: Wallet },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-zinc-50 pb-20 md:pb-0">
      {/* Desktop Sidebar (visible on md+) */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-zinc-200 bg-white z-50">
        <div className="flex flex-col flex-1 min-h-0">
          {/* Brand Logo Header */}
          <div className="flex items-center h-16 px-6 border-b border-zinc-100 gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 flex items-center justify-center text-emerald-50 font-bold shadow-xs">
              S
            </div>
            <div>
              <span className="font-semibold text-zinc-900 tracking-tight block leading-none">Antigravity SMS</span>
              <span className="text-[10px] text-zinc-400 font-medium">Administrator Workspace</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-4 py-6 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                    isActive
                      ? "bg-emerald-950 text-emerald-50 shadow-sm"
                      : "text-zinc-650 hover:text-zinc-900 hover:bg-zinc-100"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-emerald-50" : "text-zinc-400"}`} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Logout Section */}
          <div className="p-4 border-t border-zinc-100">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-3 w-full px-3 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-zinc-400" />
              Switch Persona
            </button>
          </div>
        </div>
      </aside>

      {/* Sticky Mobile Top Header (visible on < md) */}
      <header className="border-b border-zinc-200/50 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-xs h-14 flex items-center justify-between px-5 md:hidden">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-950 flex items-center justify-center text-emerald-50 font-bold text-sm shadow-xs">
            A
          </div>
          <span className="font-semibold text-zinc-900 tracking-tight text-sm">Admin Console</span>
        </div>
        <Badge variant="primary" className="py-0.5 px-2 font-normal text-[10px]">
          Administrator
        </Badge>
      </header>

      {/* Mobile Sticky Bottom Navigation Bar (visible on < md) */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-zinc-200 flex items-center justify-around px-2 z-40 shadow-lg md:hidden">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-all ${
                isActive ? "text-emerald-950" : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold tracking-wider mt-1">{item.name === "Fees & Scholarships" ? "Fees" : item.name}</span>
            </Link>
          );
        })}
        <button
          onClick={() => router.push("/")}
          className="flex flex-col items-center justify-center flex-1 h-full py-1 text-center text-zinc-400 hover:text-zinc-650 cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-semibold tracking-wider mt-1">Exit</span>
        </button>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 md:pl-64 flex flex-col">
        <main className="flex-1 py-6 px-4 md:py-8 md:px-10 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
